//@ts-ignore
import * as solana_web3 from "@solana/web3.js";
//@ts-ignore
import bs58 from "bs58";
const progId = "25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr";
//@ts-ignore

function initMalloc(connection, account) {
  // const instructionInit = new solana_web3.TransactionInstruction({
  //   keys: [],
  //   programId: new solana_web3.PublicKey(progId),
  //   data: Buffer.from(JSON.stringify({})),
  // });
  const data_account = new solana_web3.Account()
  console.log("new data account:", data_account.publicKey.toBase58());
  const createAccountTransaction = solana_web3.SystemProgram.createAccount({
    fromPubkey: account.publicKey,
    newAccountPubkey: data_account.publicKey,
    lamports: 10000,
    space: 1024,
    programId: new solana_web3.PublicKey(progId),
  });
  solana_web3
    .sendAndConfirmTransaction(
      connection,
      new solana_web3.Transaction().add(createAccountTransaction),
      [account, data_account],
      {
        skipPreflight: true,
        commitment: "singleGossip",
      }
    )
    .then(() => {
      console.log("done");
    })
    .catch((e) => {
      console.log("error", e);
    });
}
function main() {
  let connection = new solana_web3.Connection(
    "http://127.0.0.1:8899",
    // "https://devnet.solana.com",
    "singleGossip"
  );
  const account = new solana_web3.Account();
  // export type CreateAccountParams = {
  //   fromPubkey: PublicKey;
  //   newAccountPubkey: PublicKey;
  //   lamports: number;
  //   space: number;
  //   programId: PublicKey;
  // };
  const lamports = 10 * 1000000000;
  connection.requestAirdrop(account.publicKey, lamports).then(() => {
    console.log("airdrop done");
    initMalloc(connection, account);
  });
}
main();
// data account: 5QKS9hNbbP987EEDGTYiq2T3dnHHafkkiJ61KcLkrqYr