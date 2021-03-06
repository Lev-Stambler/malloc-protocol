//@ts-nocheck
import { Schema as BorshSchema, deserialize, serialize } from "borsh";
import {
  Account,
  AccountInfo,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { AccountInfo as TokenAccountInfo, Token } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID } from "../utils/ids";
import BN from "bn.js";
import { serializePubkey } from "../utils/utils";
export const SPLIT_SUM = 500;

export type PubKeyRep = number[];

class Assignable {
  constructor(properties) {
    Object.keys(properties).map((key) => {
      this[key] = properties[key];
    });
  }
}

abstract class Enum {
  //@ts-ignore
  enum: string;

  constructor(properties: any) {
    if (Object.keys(properties).length !== 1) {
      throw new Error("Enum can only take single value");
    }
    Object.keys(properties).map((key: string) => {
      (this as any)[key] = properties[key];
      this.enum = key;
    });
  }
}

class Test extends Assignable {}

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
  associated_account_is_writable: number[];
  associated_account_is_signer: number[];
}

export interface WCallChainedNode {
  name: string;
  input: string;
  output: string;
  wcall: PublicKey;
  // Very important to keep the snake case to match the prog state
  callback_basket: BasketNode;
  associateAccounts: PublicKey[];
  graphElementId?: string;
  associated_account_is_writable: number[];
  associated_account_is_signer: number[];
}

export interface Basket {
  calls: string[];
  splits: number[];
  creator: PublicKey;
  input: string;
}

const WCallSchemaObj = {};

const BasketSchema = new Map([
  [
    Test,
    {
      kind: "struct",
      fields: [
        ["creator", "string"],
        ["input", "string"],
        ["splits", "Vec<u8>"],
        ["calls", "Vec<string>"],
      ],
    },
  ],
]);

export enum WCallTypes {
  Simple = "Simple",
  Chained = "Chained",
}

export interface WCallSimple<PubKeyType> {
  wcall: PubKeyType;
  input: string;
  associated_accounts: PubKeyType[];
  associated_account_is_writable: number[];
  associated_account_is_signer: number[];
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
  associated_account_is_writable: number[];
  associated_account_is_signer: number[];
}

export function isWCallChained(
  v: WCallChained<any> | WCallChainedNode | WCallSimple<any> | WCallSimpleNode
) {
  return v.hasOwnProperty("callback_basket");
}

export interface MallocState {
  // name to public key
  wrapped_calls: {
    [name: string]:
      | { Chained: WCallChained<PublicKey> }
      | { Simple: WCallSimple<PublicKey> };
  };
  baskets: {
    [name: string]: Basket;
  };
  // name to inputName
  supported_wrapped_call_inputs: {
    [name: string]: PublicKey;
  };
  nonce: number;
}

export interface RegisterCallArgs {
  call_name: string;
  wcall:
    | { Chained: WCallChained<PublicKey> }
    | { Simple: WCallSimple<PublicKey> };
}
export interface CreateBasketArgs {
  name: string;
  calls: string[];
  splits: number[];
  input: string;
}
export interface EnactBasketArgs {
  basket_name: string;
  rent_given: number;
}
export interface InitMallocArgs {}
export interface NewSupportedWCallInput {
  input_name: string;
  input_address: PublicKey;
}

export enum ProgramInstruction {
  RegisterCall = "RegisterCall",
  CreateBasket = "CreateBasket",
  EnactBasket = "EnactBasket",
  InitMalloc = "InitMalloc",
  NewSupportedWCallInput = "NewSupportedWCallInput",
}

export class InstructionData extends Enum {
  //@ts-ignore
  RegisterCall: RegisterCallInstructionData;
  //@ts-ignore
  CreateBasket: CreateBasketInstructionData;
  //@ts-ignore
  EnactBasket: EnactBasketInstructionData;
  //@ts-ignore
  NewSupportedWCallInput: NewSupportedWCallInputInstructionData;
  //@ts-ignore
  InitMalloc: InitMallocInstructionData;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): InstructionData {
    return deserialize(SCHEMA, InstructionData, bytes);
  }

  static createNew(
    value:
      | RegisterCallInstructionData
      | CreateBasketInstructionData
      | EnactBasketInstructionData
      | NewSupportedWCallInputInstructionData
      | InitMallocInstructionData
  ): InstructionData {
    if (value instanceof RegisterCallInstructionData) {
      return new InstructionData({ RegisterCall: value });
    } else if (value instanceof CreateBasketInstructionData) {
      return new InstructionData({ CreateBasket: value });
    } else if (value instanceof EnactBasketInstructionData) {
      return new InstructionData({ EnactBasket: value });
    } else if (value instanceof NewSupportedWCallInputInstructionData) {
      return new InstructionData({ NewSupportedWCallInput: value });
    }
    return new InstructionData({ InitMalloc: value });
  }
}

export class RegisterCallInstructionData extends Assignable {
  //@ts-ignore
  call_name: string;
  //@ts-ignore
  wcall_enum: WCallBorsh;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): RegisterCallInstructionData {
    return deserialize(SCHEMA, RegisterCallInstructionData, bytes);
  }

  static createNew(
    call_name: string,
    wcall: WCallSimple<PublicKey> | WCallChained<PublicKey>
  ): RegisterCallInstructionData {
    //@ts-ignore
    if (wcall.Chained) {
      //@ts-ignore
      wcall.Chained.wcall = serializePubkey(wcall.Chained.wcall);
    } else {
      //@ts-ignore
      wcall.Simple.wcall = serializePubkey(wcall.Simple.wcall);
    }
    //@ts-ignore
    const call = wcall.Chained
      ? {
          //@ts-ignore
          Chained: new WCallChainedBorsh({ ...wcall.Chained }),
        }
      : {
          //@ts-ignore
          Simple: new WCallSimpleBorsh({ ...wcall.Simple }),
        };
    return new RegisterCallInstructionData({
      call_name,
      wcall_enum: new WCallBorsh(call),
    });
  }
}

export class CreateBasketInstructionData extends Assignable {
  //@ts-ignore
  name: string;
  //@ts-ignore
  calls: string[];
  //@ts-ignore
  splits: BN[];
  //@ts-ignore
  input: string;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): CreateBasketInstructionData {
    return deserialize(SCHEMA, CreateBasketInstructionData, bytes);
  }

  static createNew(
    name: string,
    calls: string[],
    splits: number[],
    input: string
  ): CreateBasketInstructionData {
    return new CreateBasketInstructionData({ name, calls, splits, input });
  }
}

export class EnactBasketInstructionData extends Assignable {
  //@ts-ignore
  basket_name: string;
  //@ts-ignore
  rent_given: BN;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): EnactBasketInstructionData {
    return deserialize(SCHEMA, EnactBasketInstructionData, bytes);
  }

  static createNew(
    basket_name: string,
    rent_given: number
  ): EnactBasketInstructionData {
    return new EnactBasketInstructionData({
      basket_name,
      rent_given: new BN(rent_given),
    });
  }
}

export class NewSupportedWCallInputInstructionData extends Assignable {
  //@ts-ignore
  input_name: string;
  //@ts-ignore
  input_address: number[];

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): NewSupportedWCallInputInstructionData {
    return deserialize(SCHEMA, NewSupportedWCallInputInstructionData, bytes);
  }

  static createNew(
    input_name: string,
    input_address: PublicKey
  ): NewSupportedWCallInputInstructionData {
    return new NewSupportedWCallInputInstructionData({
      input_name,
      input_address: serializePubkey(input_address),
    });
  }
}

export class InitMallocInstructionData extends Assignable {
  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): InitMallocInstructionData {
    return deserialize(SCHEMA, InitMallocInstructionData, bytes);
  }

  static createNew(): InitMallocInstructionData {
    return new InitMallocInstructionData({});
  }
}

export class WCallChainedBorsh extends Assignable {
  //@ts-ignore
  // wcall: number[];
  // //@ts-ignore
  // callback_basket: string;
  // //@ts-ignore
  // input: string;
  // //@ts-ignore
  // output: string;
  // //@ts-ignore
  // associated_accounts: number[][];
  // //@ts-ignore
  // associated_account_is_writable: number[];
  // //@ts-ignore
  // associated_account_is_signer: number[];

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): WCallChainedBorsh {
    return deserialize(SCHEMA, WCallChainedBorsh, bytes);
  }

  into(): WCallChained<PublicKey> {
    return {
      wcall: new PublicKey(this.wcall),
      callback_basket: this.callback_basket,
      input: this.input,
      output: this.output,
      associated_accounts: this.associated_accounts.map(
        (key) => new PublicKey(key)
      ),
      associated_account_is_writable: this.associated_account_is_writable,
      associated_account_is_signer: this.associated_account_is_signer,
    };
  }
}

export class WCallSimpleBorsh extends Assignable {
  //@ts-ignore
  // wcall: number[];
  // //@ts-ignore
  // input: string;
  // //@ts-ignore
  // associated_accounts: number[][];
  // //@ts-ignore
  // associated_account_is_writable: number[];
  // //@ts-ignore
  // associated_account_is_signer: number[];

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): WCallSimpleBorsh {
    return deserialize(SCHEMA, WCallSimpleBorsh, bytes);
  }

  into(): WCallSimple<PublicKey> {
    return {
      wcall: new PublicKey(this.wcall),
      input: this.input,
      associated_accounts: this.associated_accounts.map(
        (key) => new PublicKey(key)
      ),
      associated_account_is_writable: this.associated_account_is_writable,
      associated_account_is_signer: this.associated_account_is_signer,
    };
  }
}

export class BasketBorsh extends Assignable {
  //@ts-ignore
  // calls: string[];
  // //@ts-ignore
  // splits: BN[];
  // //@ts-ignore
  // creator: number[];
  // //@ts-ignore
  // input: string;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): BasketBorsh {
    return deserialize(SCHEMA, BasketBorsh, bytes);
  }

  into(): Basket {
    return {
      calls: this.calls,
      splits: this.splits.map((bn) => bn.toNumber()),
      creator: new PublicKey(this.creator),
      input: this.input,
    };
  }
}

export class BasketEntryBorsh extends Assignable {
  //@ts-ignore
  // name: string;
  // //@ts-ignore
  // basket: BasketBorsh;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): BasketEntryBorsh {
    return deserialize(SCHEMA, BasketEntryBorsh, bytes);
  }

  into() {
    return [this.name, this.basket.into()];
  }
}

export class WCallInputBorsh extends Assignable {
  //@ts-ignore
  // name: string;
  //@ts-ignore
  // input: number[];

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): WCallInputBorsh {
    return deserialize(SCHEMA, WCallInputBorsh, bytes);
  }

  into() {
    return [this.name, new PublicKey(this.input)];
  }
}

export class WCallBorsh extends Enum {
  //@ts-ignore
  // Chained: WCallChainedBorsh;
  // //@ts-ignore
  // Simple: WCallSimpleBorsh;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): WCallBorsh {
    return deserialize(SCHEMA, WCallBorsh, bytes);
  }

  into():
    | { Chained: WCallChained<PublicKey> }
    | { Simple: WCallSimple<PublicKey> } {
    if (this.enum === "Chained") {
      return {
        Chained: this.Chained.into(),
      };
    }

    return {
      Simple: this.Simple.into(),
    };
  }
}

export class WCallEntryBorsh extends Assignable {
  //@ts-ignore
  // name: string;
  // //@ts-ignore
  // wcall: WCallBorsh;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Buffer): WCallEntryBorsh {
    return deserialize(SCHEMA, WCallEntryBorsh, bytes);
  }

  into() {
    return [this.name, this.wcall.into()];
  }
}

export class MallocStateBorsh extends Assignable {
  //@ts-ignore
  // wrapped_calls: WCallEntryBorsh[];
  //@ts-ignore
  // baskets: BasketEntryBorsh[];
  //@ts-ignore
  // supported_wrapped_call_inputs: WCallInputBorsh[];
  //@ts-ignore
  // nonce: number;

  encode(): Uint8Array {
    return serialize(SCHEMA, this);
  }

  static decode(bytes: Uint8Array): MallocStateBorsh {
    let sizeBuff = bytes.slice(0, 4);
    let size = Buffer.from(sizeBuff).readUIntBE(0, 4);
    let start = 4;
    let buf = Buffer.from(bytes.slice(start, start + size));

    const dec = deserialize(SCHEMA, MallocStateBorsh, buf);
    return dec
  }

  into(): MallocState {
    const state = {
      wrapped_calls: {},
      baskets: {},
      supported_wrapped_call_inputs: {},
      nonce: 0,
    };

    (this.wrapped_calls).forEach((entry) => {
      state.wrapped_calls[entry.name] = entry.wcall.into();
    });

    (this.baskets).forEach((entry) => {
      state.baskets[entry.name] = entry.basket.into();
    });

    (this.supported_wrapped_call_inputs).forEach((entry) => {
      state.supported_wrapped_call_inputs[entry.name] = new PublicKey(
        entry.input
      );
    });
    state.nonce = this.nonce;

    return state;
  }
}

export const SCHEMA = new Map<Function, any>([
  [
    InstructionData,
    {
      kind: "enum",
      field: "enum",
      values: [
        ["RegisterCall", RegisterCallInstructionData],
        ["CreateBasket", CreateBasketInstructionData],
        ["EnactBasket", EnactBasketInstructionData],
        ["NewSupportedWCallInput", NewSupportedWCallInputInstructionData],
        ["InitMalloc", InitMallocInstructionData],
      ],
    },
  ],
  [
    RegisterCallInstructionData,
    {
      kind: "struct",
      fields: [
        ["call_name", "string"],
        ["wcall_enum", WCallBorsh],
      ],
    },
  ],
  [
    CreateBasketInstructionData,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["calls", ["string"]],
        ["splits", ["u64"]],
        ["input", "string"],
      ],
    },
  ],
  [
    EnactBasketInstructionData,
    {
      kind: "struct",
      fields: [
        ["basket_name", "string"],
        ["rent_given", "u64"],
      ],
    },
  ],
  [
    NewSupportedWCallInputInstructionData,
    {
      kind: "struct",
      fields: [
        ["input_name", "string"],
        ["input_address", [32]],
      ],
    },
  ],
  [
    InitMallocInstructionData,
    {
      kind: "struct",
      fields: [],
    },
  ],
  [
    WCallInputBorsh,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["input", [32]],
      ],
    },
  ],
  [
    BasketEntryBorsh,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["basket", BasketBorsh],
      ],
    },
  ],
  [
    MallocStateBorsh,
    {
      kind: "struct",
      fields: [
        ["wrapped_calls", [WCallEntryBorsh]],
        ["baskets", [BasketEntryBorsh]],
        ["supported_wrapped_call_inputs", [WCallInputBorsh]],
        ["nonce", "u8"],
      ],
    },
  ],
  [
    WCallBorsh,
    {
      kind: "enum",
      field: "enum",
      values: [
        ["Simple", WCallSimpleBorsh],
        ["Chained", WCallChainedBorsh],
      ],
    },
  ],
  [
    WCallChainedBorsh,
    {
      kind: "struct",
      fields: [
        ["wcall", [32]],
        ["callback_basket", "string"],
        ["input", "string"],
        ["output", "string"],
        ["associated_accounts", [[32]]],
        ["associated_account_is_writable", ["u8"]],
        ["associated_account_is_signer", ["u8"]],
      ],
    },
  ],
  [
    WCallEntryBorsh,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["wcall", WCallBorsh],
      ],
    },
  ],
  [
    WCallSimpleBorsh,
    {
      kind: "struct",
      fields: [
        ["wcall", [32]],
        ["input", "string"],
        ["associated_accounts", [[32]]],
        ["associated_account_is_writable", ["u8"]],
        ["associated_account_is_signer", ["u8"]],
      ],
    },
  ],
  [
    BasketBorsh,
    {
      kind: "struct",
      fields: [
        ["calls", ["string"]],
        ["splits", ["u64"]],
        ["creator", [32]],
        ["input", "string"],
      ],
    },
  ],
]);
