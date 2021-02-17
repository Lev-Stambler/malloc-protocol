import { Connection, SystemProgram, clusterApiUrl } from "@solana/web3.js";
//@ts-ignore
import Wallet from "@project-serum/sol-wallet-adapter";

let connection = new Connection(clusterApiUrl("devnet"));
export async function connectWallet() {
  let providerUrl = "https://www.sollet.io";
  let wallet = new Wallet(providerUrl);
  wallet.on("connect", (publicKey) =>
    console.log("Connected to " + publicKey.toBase58())
  );
  wallet.on("disconnect", () => console.log("Disconnected"));
  await wallet.connect();

  let transaction = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: wallet.publicKey,
    lamports: 100,
  });
  let { blockhash } = await connection.getRecentBlockhash();
  transaction.recentBlockhash = blockhash;
  let signed = await wallet.signTransaction(transaction);
  let txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid);
}
