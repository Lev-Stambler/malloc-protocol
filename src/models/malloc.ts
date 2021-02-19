import {
  Account,
  AccountInfo,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { AccountInfo as TokenAccountInfo, Token } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID } from "../utils/ids";

type PubKeyRep = Uint8Array;

export interface Basket {
  calls: string[];
  splits: number[];
  creator: PubKeyRep;
  input: string;
}

export interface MallocState {
  // name to public key
  wrapped_call_addrs: {
    [name: string]: PubKeyRep;
  };
  baskets: {
    [name: string]: Basket;
  };
  // name to pubkey
  supported_wrapped_call_inputs: {
    [name: string]: PubKeyRep;
  };
}

export interface RegisterCallArgs {
  call_input: String;
  call_name: String;
  to: PubKeyRep;
}
export interface CreateBasketArgs {
  name: string;
  calls: string[];
  splits: number[];
}
export interface EnactBasketArgs {
  basket_name: string;
}
export interface InitMallocArgs {}

export enum ProgramInstruction {
  RegisterCall = "RegisterCall",
  CreateBasket = "CreateBasket",
  EnactBasket = "EnactBasket",
  InitMalloc = "InitMalloc",
}

export function approve(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  account: PublicKey,
  owner: PublicKey,
  amount: number,
  autoRevoke = true,

  // if delegate is not passed ephemeral transfer authority is used
  delegate?: PublicKey
): Account {
  const tokenProgram = TOKEN_PROGRAM_ID;
  const transferAuthority = new Account();

  instructions.push(
    Token.createApproveInstruction(
      tokenProgram,
      account,
      delegate ?? transferAuthority.publicKey,
      owner,
      [],
      amount
    )
  );

  if (autoRevoke) {
    cleanupInstructions.push(
      Token.createRevokeInstruction(tokenProgram, account, owner, [])
    );
  }

  return transferAuthority;
}
