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

export enum WCallTypes {
  Simple = "Simple",
  Chained = "Chained",
}

export type WCallSimple = PublicKey;
export function isWCallSimple(v: any) {
  return v instanceof PublicKey;
}

/**
 * @info The first Pubkey is for the WCall's address, the second for the callback
 * basket
 */
export type WCallChained = PublicKey[];
export function isWCallChained(v: any) {
  return (
    v instanceof Array &&
    v.length === 2 &&
    v[0] instanceof PublicKey &&
    v[1] instanceof PublicKey
  );
}

export interface MallocState {
  // name to public key
  wrapped_calls: {
    [name: string]: {
      type: WCallTypes;
      data: WCallChained | WCallSimple;
    };
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
  wcall: {
    type: WCallTypes;
    data: WCallChained | WCallSimple;
  };
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
