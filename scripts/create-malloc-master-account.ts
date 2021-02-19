//@ts-ignore
import * as solana from "@solana/web3.js";
//@ts-ignore
import bs58 from "bs58";

//@ts-ignore
const account_secret: string = process.env.MALLOC_SECRET;
if (!account_secret) {
  throw "The contract's account secret must be an env variable";
}
async function createAccount() {
  const newAccount = new solana.Account(bs58.encode(account_secret));
}
