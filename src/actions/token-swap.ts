import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenSwap } from "@solana/spl-token-swap";
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionInstruction } from "@solana/web3.js";
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
  return malloc_class.registerCall({
    call_name: name,
    wcall: {
      Simple: {
        wcall: serializePubkey(
          new PublicKey("4GS6Ui2RrHjyeN3P94t7KTts1ZAXxnxv65ryYQmbcBp6")
        ),
        input: input_name,
        associated_accounts: [
          // Token swap prog id
          serializePubkey(
            new PublicKey("D1jwGRnE59kcDWuyqVoKmZdBPfc2PfsrTDugB5mio3gr")
          ),
          // Token swap prog account
          serializePubkey(
            new PublicKey("BKFeciwmNpazwRNhkErWEprsAzAVPSnEKeZTom5Z1hZ6")
          ),
          // TODO: create new auth account for this?
          // Authorizer
          serializePubkey(new PublicKey(delegateAccount)),

          // Split account here!

          // Source of token A, USDC
          serializePubkey(
            new PublicKey("ALWE2nd7kqwV6WpYcodpEMRbxWKAmm7aLvgiDXp1emJY")
          ),
          // Source of token B, USDT
          serializePubkey(
            new PublicKey("9rixCox5ueWNaWzox6hZCr1jat1Z9WjSLf1B4SRcY3ST")
          ),
          // Output destination
          serializePubkey(destPubkey),
          
          // Admin destination for USDC
          serializePubkey(
            new PublicKey("7c4iqwVYbSKqS7vD2EPqxkvA5W1J8nxSVofj4c1S84t2")
          ),
          serializePubkey(TOKEN_PROGRAM_ID),
          serializePubkey(SYSVAR_CLOCK_PUBKEY)
          // Clock Sysvar??
        ],
      } as WCallSimple<PubKeyRep>,
    },
  });
}
