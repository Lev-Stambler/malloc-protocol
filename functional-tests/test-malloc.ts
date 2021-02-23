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
const progId = new PublicKey("25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr");
import "mocha";
import { trimBuffer } from "../src/utils/utils";
import { MallocState } from "../src/models/malloc";

const account = new Account();
const data_account = new Account();
let connection: Connection;

function parseAccountState(data: Buffer): MallocState {
  const buf = trimBuffer(data);
  const bufString = buf.toString();
  const state = JSON.parse(bufString);
  console.log(state);
  return state;
}

async function getDataParsed() {
  const accountInfo = await connection.getAccountInfo(
    data_account.publicKey
  );
  if (!accountInfo?.data) {
    assert(false, "error getting data account info")
    return
  }
  return parseAccountState(accountInfo.data)
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

async function sendGeneralInstruction(instructions: TransactionInstruction[]) {
  try {
    const tx = new Transaction();
    instructions.forEach((inst) => {
      console.log(
        "Adding instruction with data",
        new TextDecoder("utf-8").decode(inst.data)
      );
      tx.add(inst);
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
  connection = new Connection("http://127.0.0.1:8899", "singleGossip");
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
      await initMallocData();
      assert(false);
    } catch (e) {
      assert(true);
    }
  });
  it("add some wcall inputs, register a new WCall, then create a basket, then execute that basket", async () => {
    const insts: TransactionInstruction[] = [];
    addGeneralTransaction(insts, {
      NewSupportedWCallInput: {
        input_name: "Wrapped Eth",
        input_address: [
          ...new PublicKey(
            "2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk"
          ).toBuffer(),
        ],
      },
    });
    addGeneralTransaction(insts, {
      RegisterCall: {
        call_input: "Wrapped Eth",
        call_name: "Just buy some more Eth",
        // dummy public key
        wcall: {
          Simple: [
            ...new PublicKey(
              "2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk"
            ).toBuffer(),
          ],
        },
      },
    });
    addGeneralTransaction(insts, {
      RegisterCall: {
        call_input: "Wrapped Eth",
        call_name:
          "Just buy some more Eth part 2, return of the electric bogoloo",
        // dummy public key
        wcall: {
          Simple: [
            ...new PublicKey(
              "3FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk"
            ).toBuffer(),
          ],
        },
      },
    });
    addGeneralTransaction(insts, {
      CreateBasket: {
        name: "Just buy just buy eth",
        calls: [
          "Just buy some more Eth part 2, return of the electric bogoloo",
          "Just buy some more Eth",
        ],
        splits: [500, 500],
      },
    });

    addGeneralTransaction(insts, {
      CreateBasket: {
        name: "Just buy just buy eth",
        calls: [
          "Just buy some more Eth part 2, return of the electric bogoloo",
          "Just buy some more Eth",
        ],
        splits: [500, 500],
      },
    });
    // Execute the instructions
    await sendGeneralInstruction(insts);
    const data = await getDataParsed() as MallocState
    console.log(data.baskets)
    assert(data.wrapped_calls["Just buy some more Eth"])
    assert(data.supported_wrapped_call_inputs["Wrapped Eth"])
    assert(data.baskets["Just buy just buy eth"])
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
