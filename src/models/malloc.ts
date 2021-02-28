import {
  Account,
  AccountInfo,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { AccountInfo as TokenAccountInfo, Token } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID } from "../utils/ids";

export const SPLIT_SUM = 1000;

type PubKeyRep = number[];

export interface BasketNode {
  name: string;
  input: string;
  splits: number[];
  calls: (WCallSimpleNode | WCallChainedNode)[];
  graphElementId?: string;
}

export interface WCallSimpleNode {
  name: string;
  input: string;
  wcall: PublicKey;
  associateAccounts: PublicKey[];
  graphElementId?: string;
}

export interface WCallChainedNode {
  name: string;
  input: string;
  output: string;
  wcall: PublicKey;
  callbackBasket: BasketNode;
  associateAccounts: PublicKey[];
  graphElementId?: string;
}

export interface Basket {
  calls: string[];
  splits: number[];
  creator: PublicKey;
  input: string;
}

export enum WCallTypes {
  Simple = "Simple",
  Chained = "Chained",
}

export interface WCallSimple<PubKeyType> {
  wcall: PubKeyType;
  input: string;
  associated_accounts: PubKeyType[];
}

export function isWCallSimple(v: any) {
  return !isWCallChained(v);
}

/**
 * @info The first Pubkey is for the WCall's address, the second for the callback
 * basket
 */
export interface WCallChained<PubKeyType> {
  wcall: PubKeyType;
  callback_basket: string;
  input: string;
  output: string;
  associated_accounts: PubKeyType[];
}

export function isWCallChained(v: any) {
  return v.hasOwnProperty("callbackBasket");
}

export interface MallocState {
  // name to public key
  wrapped_calls: {
    [name: string]: { Chained: WCallChained<PublicKey> } | { Simple: WCallSimple<PublicKey> };
  };
  baskets: {
    [name: string]: Basket;
  };
  // name to inputName
  supported_wrapped_call_inputs: {
    [name: string]: PublicKey;
  };
}

export interface RegisterCallArgs {
  call_name: String;
  wcall: { Chained: WCallChained<PubKeyRep> } | { Simple: WCallSimple<PubKeyRep> };
}
export interface CreateBasketArgs {
  name: string;
  calls: string[];
  splits: number[];
  input: string;
}
export interface EnactBasketArgs {
  basket_name: string;
}
export interface InitMallocArgs {}
export interface NewSupportedWCallInput {
  input_name: string;
  input_address: PubKeyRep;
}

export enum ProgramInstruction {
  RegisterCall = "RegisterCall",
  CreateBasket = "CreateBasket",
  EnactBasket = "EnactBasket",
  InitMalloc = "InitMalloc",
  NewSupportedWCallInput = "NewSupportedWCallInput",
}
