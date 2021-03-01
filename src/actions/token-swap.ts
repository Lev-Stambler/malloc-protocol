import { Malloc } from "../contexts/malloc-class";
import { serializePubkey } from "../utils/utils";

export function registerTokSwapWCall(malloc_class: Malloc) {
  return malloc_class.registerCall({
    call_name: "SWAP SOL for MINT",
    wcall: {
      Simple: {
        wcall: serializePubkey(SWAP_WCALL),
        input: "WSol",
        associated_accounts: [
          serializePubkey(TOKEN_SWAP_PROG),
          serializePubkey(SWAP_AUTH),
          serializePubkey(WRAPPED_SOL_MINT),
          serializePubkey(WRAPPED_INTO_MINT),
          serializePubkey(swapIntoAccount),
          serializePubkey(POOL_TOKEN_MINT),
          serializePubkey(FEE_ACCOUNT),
        ],
      } as WCallSimple<PubKeyRep>,
    },
  });
}
