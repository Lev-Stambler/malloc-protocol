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
import { writeFileSync } from 'fs';

import {programId} from "../../src/config/program_id.json"

const progId = new PublicKey(
  programId
  //process.env.programID || "25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr"
);

const account = new Account();
const data_account = new Account();

async function initDataAccount(
  connection: Connection,
  account: Account,
  data_account: Account
) {
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

async function initMallocData(connection: Connection, data_account: Account) {
  const instructionInit = new TransactionInstruction({
    keys: [
      {
        isWritable: true,
        pubkey: data_account.publicKey,
        isSigner: true,
      },
    ],
    programId: progId,
    data: Buffer.from(JSON.stringify({ InitMalloc: {} })),
  });
  try {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(instructionInit),
      [account, data_account],
      {
        skipPreflight: true,
        commitment: "singleGossip",
      }
    );
    console.log("Initialized the data in data_account");
    const data_account_info = await connection.getAccountInfo(
      data_account.publicKey
    );
    writeFileSync("src/config/data_account.json", JSON.stringify({
      data_account_address: data_account.publicKey.toBase58()
    }));
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

async function initAccounts(): Promise<Connection> {
  let connection = new Connection("https://devnet.solana.com", "singleGossip");
  const lamports = 10 * 1000000000;
  console.log("new data account:", data_account.publicKey.toBase58());
  await connection.requestAirdrop(account.publicKey, lamports);
  console.log("airdrop done");
  initDataAccount(connection, account, data_account);
  return connection;
}

async function main() {
  let conn: Connection;
  conn = await initAccounts();
  await initMallocData(conn, data_account);
}
main()
