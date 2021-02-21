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

export async function registerCall(
  args: RegisterCallArgs
): Promise<TransactionInstruction> {
  return new TransactionInstruction()
}
export async function createBasket(args: CreateBasketArgs) {
  // TODO: implement
}
export async function enactBasket(args: EnactBasketArgs) {
  // TODO: implement
}
export async function initMalloc(args: InitMallocArgs) {
  // TODO: implement
}

async function sendInstructions() {}
