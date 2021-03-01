//@ts-ignore
import {
  Account,
  PublicKey,
  Connection,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
//@ts-ignore
import bs58 from "bs58";
import { assert } from "chai";
const progKey = require("../src/config/program_id.json").programId;
const progId = new PublicKey(progKey);
import "mocha";
import { serializePubkey, trimBuffer } from "../src/utils/utils";
import { MallocState, PubKeyRep, WCallSimple } from "../src/models/malloc";
import { registerTokSwapWCall } from "../src/actions/token-swap";
// @ts-ignore
import { Malloc } from "../src/contexts/malloc-class";
import { WalletProvider } from "../src/contexts/wallet";
import { WRAPPED_SOL_MINT } from "@project-serum/serum/lib/token-instructions";
import { createTokenAccount } from "../src/actions";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenSwap } from "@solana/spl-token-swap";
import { serialize } from "borsh";
import BN from "bn.js";

const SolanaNet = "https://devnet.solana.com";
const SIMPLE_PASS_THROUGH_WCALL = new PublicKey(
  "G3bXM8ioQhAGJfCyQL9v6W4x1FVcFjGgtSgRiwkfYa4a"
);

const account = new Account();
const data_account = new Account();
let connection: Connection;

function parseAccountState(data: Buffer): MallocState {
  const buf = trimBuffer(data);
  const bufString = buf.toString();
  const state = JSON.parse(bufString);

  return state;
}

async function getDataParsed() {
  const accountInfo = await connection.getAccountInfo(data_account.publicKey);
  if (!accountInfo?.data) {
    assert(false, "error getting data account info");
    return;
  }
  return parseAccountState(accountInfo.data);
}

async function initDataAccount() {
  const createAccountTransaction = SystemProgram.createAccount({
    fromPubkey: account.publicKey,
    newAccountPubkey: data_account.publicKey,
    lamports: 1000000000,
    space: 1024 * 1024, // this is like bytes, wholly poop, so this is 1 meg
    programId: progId,
  });
  try {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createAccountTransaction),
      [account, data_account],
      {
        skipPreflight: true,
        commitment: "singleGossip",
      }
    );
    console.log("Data account init");
  } catch (e) {
    console.error(e);
    throw "Failed to initDataAccount";
  }
}

function addGeneralTransaction(
  instructions: TransactionInstruction[],
  data: any
) {
  instructions.push(
    new TransactionInstruction({
      keys: [
        {
          isWritable: true,
          pubkey: data_account.publicKey,
          isSigner: false,
        },
        {
          isWritable: true,
          pubkey: account.publicKey,
          isSigner: true,
        },
      ],
      programId: progId,
      data: Buffer.from(JSON.stringify(data)),
    })
  );
}

async function sendGeneralInstruction(
  instructions: TransactionInstruction[],
  signers: Account[] = []
) {
  try {
    const tx = new Transaction();
    instructions.forEach((inst) => {
      tx.add(inst);
    });
    const txRet = await sendAndConfirmTransaction(
      connection,
      tx,
      [account, ...signers],
      {
        skipPreflight: true,
        commitment: "singleGossip",
      }
    );
    const data_account_info = await connection.getAccountInfo(
      data_account.publicKey
    );
    return txRet;
  } catch (e) {
    console.error("Error with send general", e);
    throw e;
  }
}

async function doGeneralInstrSingleton(instruction: TransactionInstruction) {
  await sendGeneralInstruction([instruction]);
}

async function initMallocData(malloc_class: Malloc) {
  const inst = malloc_class.initState()
  const tx = await sendGeneralInstruction([inst], [data_account]);
  console.log("Init TX", tx)
}

async function initAccounts(): Promise<Connection> {
  connection = new Connection(SolanaNet, "singleGossip");
  const lamports = 10 * 1000000000;
  console.log("new data account:", data_account.publicKey.toBase58());
  await connection.requestAirdrop(account.publicKey, lamports);
  console.log("airdrop done");
  initDataAccount();
  return connection;
}

async function fundWithWSol(amount: number): Promise<PublicKey> {
  const userInputPubKey = await Token.createWrappedNativeAccount(
    connection,
    TOKEN_PROGRAM_ID,
    account.publicKey,
    account,
    amount
  );

  return userInputPubKey;
}

describe("Run a standard set of Malloc tests", async function () {
  this.timeout(200000);
  let malloc_class: Malloc;
  before(async function () {
    this.timeout(200000);
    connection = await initAccounts();
    malloc_class = new Malloc(
      data_account.publicKey,
      progId,
      connection,
      undefined,
      {}
    );
    malloc_class.setUserPubKeyAlt(account.publicKey);

    await initMallocData(malloc_class);
    const data = await connection.getAccountInfo(data_account.publicKey)

    let insts = [];
    malloc_class.registerNewSupportedWCall(insts, {
      input_name: "WSol",
      input_address: WRAPPED_SOL_MINT,
    });
    await doGeneralInstrSingleton(insts[0]);
    console.log("WSol registered")
  });

  it("fails if already registered", async () => {
    try {
      await initMallocData(malloc_class);
      assert(false);
    } catch (e) {
      assert(true);
    }
  });

  it("add some wcall inputs, register a new WCall, then create a basket, then execute that basket", async () => {
    let instsDummy: TransactionInstruction[] = [];

    const createWCallAssociatedAccountsInsts: TransactionInstruction[] = [];
    await malloc_class.refresh();
    const associatedAccountSigners: Account[] = [];
    const tok = new Token(
      connection,
      WRAPPED_SOL_MINT,
      TOKEN_PROGRAM_ID,
      account
    );

    const I_GET_THE_MONEY = createTokenAccount(
      createWCallAssociatedAccountsInsts,
      account.publicKey,
      await malloc_class.getEphemeralAccountRent(),
      WRAPPED_SOL_MINT,
      account.publicKey,
      associatedAccountSigners
    );
    await sendGeneralInstruction(
      createWCallAssociatedAccountsInsts,
      associatedAccountSigners
    );
    const iGetMoneyStartingInfo = await tok.getAccountInfo(I_GET_THE_MONEY);
    console.log(
      "I get money starts out with",
      iGetMoneyStartingInfo.amount.toString()
    );

    instsDummy = [];
    instsDummy.push(
      malloc_class.registerCall({
        call_name: "takes money from one account to another",
        // dummy public key
        wcall: {
          Simple: {
            wcall: SIMPLE_PASS_THROUGH_WCALL,
            input: "WSol",
            associated_accounts: [I_GET_THE_MONEY],
            associated_account_is_writable: [1],
            associated_account_is_signer: [0],
          },
        },
      })
    );
    await doGeneralInstrSingleton(instsDummy[0]);
    await malloc_class.refresh();
    await doGeneralInstrSingleton(
      malloc_class.registerCall({
        call_name: "takes money from one account to another chained",
        // dummy public key
        wcall: {
          Chained: {
            wcall: SIMPLE_PASS_THROUGH_WCALL,
            input: "WSol",
            output: "WSol",
            callback_basket: "Just a simp",
            associated_accounts: [],
            associated_account_is_signer: [],
            associated_account_is_writable: []
          },
        },
      })
    );
    await malloc_class.refresh();
    await doGeneralInstrSingleton(
      malloc_class.createBasket({
        name: "Just a simp",
        calls: [
          "takes money from one account to another",
          "takes money from one account to another",
          // "takes money from one account to another",
        ],
        splits: [500, 500],
        input: "WSol",
      })
    );
    await doGeneralInstrSingleton(
      malloc_class.createBasket({
        name: "Just a chained",
        calls: [
          "takes money from one account to another chained",
          // "takes money from one account to another",
        ],
        splits: [1000],
        input: "WSol",
      })
    );

    await malloc_class.refresh();
    const rent = await malloc_class.getEphemeralAccountRent();
    const insts: TransactionInstruction[] = [];
    const amountInFundedWSol = 1 * 1000 * 1000 * 1000;
    const fundedWSolAccount = await fundWithWSol(amountInFundedWSol + 1000);

    const fundedWSolInfo = await tok.getAccountInfo(fundedWSolAccount);

    console.log("WSol in funded with sol:", fundedWSolInfo.amount.toNumber());

    const basketNode = malloc_class.getCallGraph("Just a simp");
    const accounts = malloc_class.invokeCallGraph(
      insts,
      basketNode,
      fundedWSolAccount,
      await malloc_class.getEphemeralAccountRent(),
      amountInFundedWSol
    );

    // await sendGeneralInstruction([insts[0]], [accounts[0],])
    // await sendGeneralInstruction([insts[1]], [accounts[0]])
    // await sendGeneralInstruction([insts[2]], [accounts[0], accounts[2]])
    const txRet = await sendGeneralInstruction(insts, accounts);
    console.log("ENACT BASKET DONE, ", txRet);

    const data = (await getDataParsed()) as MallocState;
    console.log("baskets:", data.baskets);
    assert(data.wrapped_calls["takes money from one account to another"]);
    assert(data.supported_wrapped_call_inputs["WSol"]);
    assert(data.baskets["Just a simp"]);
    const iGetMoneyInfo = await tok.getAccountInfo(I_GET_THE_MONEY);
    const amountIncrease = iGetMoneyInfo.amount
      .sub(iGetMoneyStartingInfo.amount)
      .toNumber();
    console.log("I get money gets this may more coins", amountIncrease);
    // account for payments
    assert(amountInFundedWSol === amountIncrease);
    const fundedWSolInfoNew = await tok.getAccountInfo(fundedWSolAccount);
    console.log(
      "WSol is now funded with sol:",
      fundedWSolInfoNew.amount.toNumber()
    );

    // TODO change to sep fn
    const instsChained = [];
    const basketChainedNode = malloc_class.getCallGraph("Just a chained");
    const accountsChained = malloc_class.invokeCallGraph(
      instsChained,
      basketChainedNode,
      // TODO: make seconded funded with sol account
      I_GET_THE_MONEY,
      await malloc_class.getEphemeralAccountRent(),
      amountInFundedWSol
    );
    const txRetChainedEph = await sendGeneralInstruction(
      instsChained.slice(0, instsChained.length - 1),
      accountsChained
    );
    const txRetChained = await sendGeneralInstruction(
      [instsChained[instsChained.length - 1]],
      accountsChained
    );
    console.log("CHAINED TX for first part", txRetChained);
  });

  xit("Try token swap out", async () => {
    let insts: TransactionInstruction[] = [];
    const signers: Account[] = [];
    const TOKEN_A_MINT = new PublicKey(
      "HqrhXafTxwqk9G1nf47YWDvTpB5jDtmUnWTsU7mse41S"
    );

    const sourceAccount = createTokenAccount(
      insts,
      account.publicKey,
      await malloc_class.getEphemeralAccountRent(),
      // Token A Mint
      TOKEN_A_MINT,
      account.publicKey,
      signers
    );
    const destAccount = createTokenAccount(
      insts,
      account.publicKey,
      await malloc_class.getEphemeralAccountRent(),
      // Token B Mint
      new PublicKey("4dY4fUtB7vGQXRfQd5m4KR8fcT4U2yWLT3xCQM5qgFhS"),
      account.publicKey,
      signers
    );

    await sendGeneralInstruction(insts, signers);
    console.log("Create tok swap accounts");

    const wcallName = "SWAP TOK_A for TOK_B";

    insts = [];
    malloc_class.registerNewSupportedWCall(insts, {
      input_name: "TOK A",
      input_address: TOKEN_A_MINT,
    }),
      await sendGeneralInstruction([
        registerTokSwapWCall(malloc_class, wcallName, "TOK A", destAccount),
      ]);
    console.log("Registered WCall");
    await malloc_class.refresh();
    assert(
      (malloc_class.state?.wrapped_calls[wcallName] as any).Simple
        .associated_accounts.length === 9
    );

    await sendGeneralInstruction([
      malloc_class.createBasket({
        name: "Swap basic basket",
        calls: [wcallName],
        splits: [1000],
        input: "TOK A",
      }),
    ]);
    console.log("Basket created");
    insts = [];
    const amountInFunded = 2;

    await malloc_class.refresh();
    const basketNode = malloc_class.getCallGraph("Swap basic basket");
    const accounts = malloc_class.invokeCallGraph(
      insts,
      basketNode,
      sourceAccount,
      await malloc_class.getEphemeralAccountRent(),
      amountInFunded
    );

    // Dest account
    // accounts.push(signers[1])
    const txRet = await sendGeneralInstruction(insts, accounts);
  });
});
