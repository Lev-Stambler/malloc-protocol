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
import { MallocState } from "../src/models/malloc";
// @ts-ignore
import { Malloc } from "../src/contexts/malloc-class";
import { WalletProvider } from "../src/contexts/wallet";
import { WRAPPED_SOL_MINT } from "@project-serum/serum/lib/token-instructions";
import { createTokenAccount } from "../src/actions";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
  // const instructionInit = new TransactionInstruction({
  //   keys: [],
  //   programId: new PublicKey(progId),
  //   data: Buffer.from(JSON.stringify({})),
  // });
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
      console.log(
        "Adding instruction with data",
        new TextDecoder("utf-8").decode(inst.data),
        "And with account pubkeys",
        inst.keys.map(key => {return {
          "Pubkey": key.pubkey.toBase58()
        }})
        // inst.keys.map(key => key.pubkey.toBase58())
      );
      tx.add(inst);
    });
    await sendAndConfirmTransaction(connection, tx, [account, ...signers], {
      skipPreflight: true,
      commitment: "singleGossip",
    });
    const data_account_info = await connection.getAccountInfo(
      data_account.publicKey
    );
    // console.log(
    //   new TextDecoder("utf-8").decode(
    //     new Uint8Array(data_account_info?.data || [])
    //   )
    // );
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function doGeneralInstrSingleton(data: any) {
  const insts: TransactionInstruction[] = [];
  addGeneralTransaction(insts, data);
  await sendGeneralInstruction(insts, []);
}

async function initMallocData() {
  const insts: TransactionInstruction[] = [];
  addGeneralTransaction(insts, { InitMalloc: {} });
  await sendGeneralInstruction(insts);
}

async function initAccounts(): Promise<Connection> {
  connection = new Connection("https://devnet.solana.com", "singleGossip");
  const lamports = 10 * 1000000000;
  console.log("new data account:", data_account.publicKey.toBase58());
  await connection.requestAirdrop(account.publicKey, lamports);
  console.log("airdrop done");
  initDataAccount();
  return connection;
}

async function fundWithWSol(amount: number): Promise<PublicKey> {
  const userInputPubKey = await Token.createWrappedNativeAccount(connection, TOKEN_PROGRAM_ID, account.publicKey, account, amount);
  
  return userInputPubKey
}

describe("Run a standard set of Malloc tests", async function () {
  this.timeout(20000);
  before(async function () {
    this.timeout(20000);
    connection = await initAccounts();
    await initMallocData();
  });
  it("fails if already registered", async () => {
    try {
      await initMallocData();
      assert(false);
    } catch (e) {
      assert(true);
    }
  });
  it("add some wcall inputs, register a new WCall, then create a basket, then execute that basket", async () => {
    let instsDummy = [];
    // await doGeneralInstrSingleton({

    // })
    await doGeneralInstrSingleton({
      NewSupportedWCallInput: {
        input_name: "WSol",
        input_address: [...WRAPPED_SOL_MINT.toBuffer()],
      },
    });
    await doGeneralInstrSingleton({
      RegisterCall: {
        call_name: "Just buy some more Eth",
        // dummy public key
        wcall_enum: {
          Simple: {
            wcall: serializePubkey(
              new PublicKey("2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk")
            ),
            input: "WSol",
            associated_accounts: [],
          },
        },
      },
    });
    await doGeneralInstrSingleton({
      RegisterCall: {
        call_name:
          "Just buy some more Eth part 2, return of the electric bogoloo",
        // dummy public key
        wcall_enum: {
          Simple: {
            wcall: serializePubkey(
              new PublicKey("3FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk")
            ),
            input: "WSol",
            associated_accounts: [],
          },
        },
      },
    });
    await doGeneralInstrSingleton({
      CreateBasket: {
        name: "Just buy just buy eth",
        calls: [
          "Just buy some more Eth part 2, return of the electric bogoloo",
          "Just buy some more Eth",
        ],
        splits: [500, 500],
        input: "WSol",
      },
    });

    const malloc_class = new Malloc(
      data_account.publicKey,
      progId,
      connection,
      undefined,
      {}
    );
    malloc_class.setUserPubKeyAlt(account.publicKey);

    await malloc_class.refresh();
    const rent = await malloc_class.getEphemeralAccountRent();
    const insts: TransactionInstruction[] = [];
    const basketNode = malloc_class.getCallGraph("Just buy just buy eth");
    console.log("Basket node", basketNode);
    const amount = 100 * 1000
    const fundedWSolAccount = await fundWithWSol(amount + 10);

    const accounts = malloc_class.invokeCallGraph(
      insts,
      basketNode,
      fundedWSolAccount,
      await malloc_class.getEphemeralAccountRent(),
      amount
    );
    console.log("Accounts:", accounts.map(k => k.publicKey.toBase58()));
    console.log(insts.length)

    // await sendGeneralInstruction([insts[0]], [accounts[0],])
    // await sendGeneralInstruction([insts[1]], [accounts[0]])
    // await sendGeneralInstruction([insts[2]], [accounts[0], accounts[2]])
    for (let i = 0; i < insts.length; i++) {
      // await sendGeneralInstruction([insts[i]], accounts)
    }
    await sendGeneralInstruction(insts, accounts)

    const data = (await getDataParsed()) as MallocState;
    console.log("baskets:", data.baskets);
    assert(data.wrapped_calls["Just buy some more Eth"]);
    assert(data.supported_wrapped_call_inputs["WSol"]);
    assert(data.baskets["Just buy just buy eth"]);
  });
});
// pub enum WCall {
//   Simple(WCallAddr),
//   Chained(WCallAddr, BasketName),
// }

// pub enum ProgInstruction {
//   RegisterCall {
//       call_input: WCallInputName,
//       call_name: WCallName,
//       wcall: WCall,
//   },
//   CreateBasket {
//       name: BasketName,
//       calls: Vec<WCallName>,
//       splits: Vec<i32>,
//   },
//   EnactBasket {
//       basket_name: BasketName,
//   },
//   NewSupportedWCallInput {
//       input_name: String,
//       input_address: Pubkey
//   },
//   InitMalloc {},
// }
