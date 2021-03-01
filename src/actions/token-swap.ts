import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenSwap } from "@solana/spl-token-swap";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Malloc } from "../contexts/malloc-class";
import { PubKeyRep, WCallSimple } from "../models/malloc";
import { serializePubkey } from "../utils/utils";
const SWAP_DATA = require("../config/swap_data.json");

// TODO: this is wrong with the input
export function registerTokSwapWCall(
  malloc_class: Malloc,
  destPubkey: PublicKey,
) {
  const swapProgId = "";
  const swapAddr = "";
  const swapMintA = "";
  const swapMintB = "";
  const delegateAccount = "GCwcUbjki5tRS6kFsbSHxrGb1EtDCWrGeHq6Ausnaz7Q";

  // https://explorer.solana.com/tx/3cmZsTrd9DvJpuekUPFYxW6imcL1pxsj8ZgKRrozqKvcTnk25pWM7vSybe5vixtFUTJLZhm2XTUVQPNvxWNt4tUx?cluster=devnet
  return malloc_class.registerCall({
    call_name: "SWAP SOL for MINT",
    wcall: {
      Simple: {
        wcall: serializePubkey(
          new PublicKey("4GS6Ui2RrHjyeN3P94t7KTts1ZAXxnxv65ryYQmbcBp6")
        ),
        input: "WSol",
        associated_accounts: [
          serializePubkey(
            new PublicKey("D1jwGRnE59kcDWuyqVoKmZdBPfc2PfsrTDugB5mio3gr")
          ),
          serializePubkey(
            new PublicKey("BKFeciwmNpazwRNhkErWEprsAzAVPSnEKeZTom5Z1hZ6")
          ),
          serializePubkey(new PublicKey(delegateAccount)),
          // Split account here!
          // serializePubkey(new PublicKey("DxYP27XLpDZTyqEuErLXmBjDP8Diqb8DHTswvmLtvL3Z")),
          serializePubkey(
            new PublicKey("ALWE2nd7kqwV6WpYcodpEMRbxWKAmm7aLvgiDXp1emJY")
          ),
          // Source of token B
          serializePubkey(
            new PublicKey("9rixCox5ueWNaWzox6hZCr1jat1Z9WjSLf1B4SRcY3ST")
          ),
          serializePubkey(destPubkey),
          serializePubkey(TOKEN_PROGRAM_ID),
        ],
      } as WCallSimple<PubKeyRep>,
    },
  });
}
