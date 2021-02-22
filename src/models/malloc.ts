import {
  Account,
  AccountInfo,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { AccountInfo as TokenAccountInfo, Token } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID } from "../utils/ids";

export const SPLIT_SUM = 1000;

type PubKeyRep = Uint8Array;

export interface BasketNode {
  name: string
  splits: number[];
  calls: (WCallSimpleNode | WCallChainedNode)[];
}

export interface WCallSimpleNode {
  name: string;
  wcall: PublicKey;
}

export interface WCallChainedNode {
  name: string;
  wcall: PublicKey;
  callbackBasket: BasketNode;
}


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
export interface WCallChained  {
  wcall: PublicKey;
  callback_basket: string;
  output: string;
}

export function isWCallChained(v: any) {
  return v.hasOwnProperty("callbackBasket");
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
  // name to inputName
  supported_wrapped_call_inputs: {
    [name: string]: string;
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
