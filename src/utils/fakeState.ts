import {Account, PublicKey} from "@solana/web3.js";
import { random, company } from "faker";
import { Basket, MallocState, WCallSimple, WCallChained } from "../models/malloc";


export function fakeMallocState(): MallocState  {
  const numCalls = randRange(15, 30);
  const callNames = [...Array(numCalls)].map(_ => company.bs());

  const numBaskets = randRange(3, 12);
  const basketNames = [...Array(numBaskets)].map(_ => company.catchPhrase());
  const state: MallocState = {
    wrapped_calls: {},
    baskets: {},
    supported_wrapped_call_inputs: {},
    nonce: 1
  }

  inputs.forEach(inputName => {
    state.supported_wrapped_call_inputs[inputName] = fakeAccount().publicKey;
  });
  basketNames.forEach(basketName => {
    const calls = random.arrayElements(callNames, randRange(1, 5));
    const basket = fakeBasket(calls);
    state.baskets[basketName] = basket;
  })
  callNames.forEach(callName => {
    const isChained = random.boolean();
    if (isChained) {
      const callback_basket = random.arrayElement(basketNames);
      const output = state.baskets[callback_basket].input;
      state.wrapped_calls[callName] = {
        Chained: fakeWCallChained(callback_basket, output)
      }
    } else {
      state.wrapped_calls[callName] = {
        Simple: fakeWCallSimple()
      }
    }
  });

  return state;
}

export function fakeAccount(): Account {
  return new Account();
}

export function fakeWCallChained(callback_basket: string, output: string): WCallChained<PublicKey> {
  const associatedAccountInfo = [...Array(randRange(1, 12))].map(_ => ({
    info: fakeAccount().publicKey,
    isSigner: random.boolean(),
    isWritable: random.boolean()
  }));
  return {
    input: fakeInput(),
    output: output,
    wcall: (new Account()).publicKey,
    callback_basket: callback_basket,
    associated_accounts: associatedAccountInfo.map(val => val.info),
    associated_account_is_signer: associatedAccountInfo.map(val => val.isSigner),
    associated_account_is_writable: associatedAccountInfo.map(val => val.isWritable)
  }
}

export function fakeWCallSimple(): WCallSimple<PublicKey> {
  const associatedAccountInfo = [...Array(randRange(1, 12))].map(_ => ({
    info: fakeAccount().publicKey,
    isSigner: random.boolean(),
    isWritable: random.boolean()
  }));
  return {
    input: fakeInput(),
    wcall: (new Account()).publicKey,
    associated_accounts: associatedAccountInfo.map(val => val.info),
    associated_account_is_signer: associatedAccountInfo.map(val => val.isSigner),
    associated_account_is_writable: associatedAccountInfo.map(val => val.isWritable)
  }
}

export function fakeBasket(calls: string[]): Basket {
  return {
    creator: fakeAccount().publicKey,
    input: fakeInput(),
    splits: randSplits(calls.length),
    calls,
  }
}

let inputs = [
  "SOL",
  "WETH",
  "USDC",
  "DAI",
  "WBTC",
  ""
]

export function fakeInput(): string {
  return random.arrayElement(inputs);
}

function randRange(a: number, b: number): number {
  const magnitude = Math.floor(Math.random() * (b-a));
  return magnitude + a;
}

function randSplits(i: number): number[] {
  let sum = 0;
  const baseVals = [...Array(i)].map(_ => {
    const val = randRange(0, 100);
    sum += val;
    return val;
  });
  let normSum = 0;
  return baseVals.map((val, i) => {
    const norm = Math.floor((val / sum) * 500);
    normSum += norm;
    if (i === baseVals.length - 1 && normSum !== 500) {
      return norm + (500 - normSum);
    }
    return norm;
  });
}
