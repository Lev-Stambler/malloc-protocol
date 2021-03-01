import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenSwap } from "@solana/spl-token-swap";
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { Malloc } from "../contexts/malloc-class";
import { PubKeyRep, WCallSimple } from "../models/malloc";
import { serializePubkey } from "../utils/utils";
const SWAP_DATA = require("../config/swap_data.json");

// TODO: this is wrong with the input
export function registerTokSwapWCall(
  malloc_class: Malloc,
  name: string,
  input_name: string,
  destPubkey: PublicKey
) {
  const swapProgId = "";
  const swapAddr = "";
  const swapMintA = "";
  const swapMintB = "";
  const delegateAccount = "GCwcUbjki5tRS6kFsbSHxrGb1EtDCWrGeHq6Ausnaz7Q";

  // https://explorer.solana.com/tx/3cmZsTrd9DvJpuekUPFYxW6imcL1pxsj8ZgKRrozqKvcTnk25pWM7vSybe5vixtFUTJLZhm2XTUVQPNvxWNt4tUx?cluster=devnet
  const associated_accounts = [
    // Token swap prog id
    new PublicKey("D1jwGRnE59kcDWuyqVoKmZdBPfc2PfsrTDugB5mio3gr"),
    // Token swap prog account
    new PublicKey("BKFeciwmNpazwRNhkErWEprsAzAVPSnEKeZTom5Z1hZ6"),
    // TODO: create new auth account for this?
    // Authorizer
    new PublicKey(delegateAccount),
    // Split account here!

    // Source of token A, USDC
    new PublicKey("ALWE2nd7kqwV6WpYcodpEMRbxWKAmm7aLvgiDXp1emJY"),
    // Source of token B, USDT
    new PublicKey("9rixCox5ueWNaWzox6hZCr1jat1Z9WjSLf1B4SRcY3ST"),
    // Output destination
    destPubkey,
    // Admin destination for USDC
    new PublicKey("7c4iqwVYbSKqS7vD2EPqxkvA5W1J8nxSVofj4c1S84t2"),
    TOKEN_PROGRAM_ID,
    SYSVAR_CLOCK_PUBKEY,
  ];
  const associated_account_is_signer = associated_accounts.map((i) => 0);
  const associated_account_is_writable = [
    // Token swap prog id
    0,
    // Token swap prog account
    0,
    // TODO: create new auth account for this?
    // Authorizer
    0,
    // Split account here!

    // Source of token A, USDC
    1,
    // Source of token B, USDT
    1,
    // Output destination
    1,
    // Admin destination for USDC
    1,
    // Tok prog ID
    0,
    // Sysvar clock
    0,
  ];
  return malloc_class.registerCall({
    call_name: name,
    wcall: {
      Simple: {
        wcall: new PublicKey("4GS6Ui2RrHjyeN3P94t7KTts1ZAXxnxv65ryYQmbcBp6"),
        input: input_name,
        associated_account_is_writable,
        associated_account_is_signer,
        associated_accounts,
      },
    },
  });
}
