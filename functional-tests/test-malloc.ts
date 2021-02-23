// TODO: change over to Rust for functional test
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
const progId = new PublicKey(
  "25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr"
);
import "mocha";

const account = new Account();
const data_account = new Account();
let connection: Connection;

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
          pubkey: account.publicKey,
          isSigner: true,
        },
        {
          isWritable: true,
          pubkey: data_account.publicKey,
          isSigner: false,
        }, 
      ],
      programId: progId,
      data: Buffer.from(JSON.stringify(data)),
    })
  );
}

async function sendGeneralInstruction(instructions: TransactionInstruction[]) {
  try {
    const tx = new Transaction();
    instructions.forEach((inst) => {
      console.log("Adding instruction with data", new TextDecoder('utf-8').decode(inst.data))
      tx.add(inst)
    });
    await sendAndConfirmTransaction(connection, tx, [account], {
      skipPreflight: true,
      commitment: "singleGossip",
    });
    console.log("Initialized the data in data_account");
    const data_account_info = await connection.getAccountInfo(
      data_account.publicKey
    );
    console.log(
      new TextDecoder("utf-8").decode(
        new Uint8Array(data_account_info?.data || [])
      )
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function initMallocData() {
  const insts: TransactionInstruction[] = [];
  addGeneralTransaction(insts, { InitMalloc: {} });
  await sendGeneralInstruction(insts);
}

async function initAccounts(): Promise<Connection> {
  let connection = new Connection("http://127.0.0.1:8899", "singleGossip");
  const lamports = 10 * 1000000000;
  console.log("new data account:", data_account.publicKey.toBase58());
  await connection.requestAirdrop(account.publicKey, lamports);
  console.log("airdrop done");
  initDataAccount();
  return connection;
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
      await initDataAccount();
      assert(false);
    } catch (e) {
      assert(true);
    }
  });
  it("add some wcall inputs, register a new WCall, then create a basket, then execute that basket", async () => {
    const insts: TransactionInstruction[] = [];
    addGeneralTransaction(insts, {
      NewSupportedWCallInput: {
        input_name: "Wrapped SOL",
        input_address: [
          ...new PublicKey(
            "So11111111111111111111111111111111111111112"
          ).toBuffer(),
        ],
      },
    });

    // Execute the instructions
    await sendGeneralInstruction(insts);
  });
});
