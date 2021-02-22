import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  Connection,
} from "@solana/web3.js";
import React, {useEffect, useMemo, useContext} from "react";
import { useConnectionConfig, sendTransaction } from "../contexts/connection";
import { useWallet, WalletAdapter } from "../contexts/wallet";
import {
  RegisterCallArgs,
  WCallTypes,
  BasketNode,
  WCallSimple,
  WCallChained,
  isWCallChained,
  isWCallSimple,
  WCallSimpleNode,
  WCallChainedNode,
  CreateBasketArgs,
  EnactBasketArgs,
  InitMallocArgs,
  Basket,
  SPLIT_SUM,
  MallocState,
} from "../models/malloc";
import { serializePubkey, trimBuffer } from "../utils/utils";

const PROGRAM_STATE_ADDR = new PublicKey(
  require("../config/data_account.json").data_account_address
);
const PROGRAM_ID = new PublicKey(
  require("../config/program_id.json").programId
);
const REFRESH_INTERVAL = 1000;
const MallocContext = React.createContext<Malloc | null>(null);

export const useMalloc = () => {
  const context = useContext(MallocContext);
  return context as Malloc;
}

export function MallocProvider({ children = null as any}) {
  const { endpoint } = useConnectionConfig();
  const { wallet } = useWallet();
  const connection = useMemo(() => new Connection(endpoint, "recent"), [ endpoint ]);
  const malloc = useMemo(() => new Malloc(PROGRAM_STATE_ADDR, PROGRAM_ID, connection, wallet), [connection, wallet])
  
  useEffect(() => {
    let timer = 0;

    const updateMalloc = async () => {
      await malloc.refresh();
      timer = window.setTimeout(() => updateMalloc, REFRESH_INTERVAL);
    };

    updateMalloc();

    return () => {
      window.clearTimeout(timer);
    }
  }, [malloc]);

  return (
    <MallocContext.Provider value={malloc}>{children}</MallocContext.Provider>
  );
}

class Malloc {
  private progStateAccount: PublicKey;
  private progId: PublicKey;
  private connection: Connection;
  private wallet: WalletAdapter | undefined;
  private state: MallocState | null;

  constructor(
    progStateAccount: PublicKey,
    progId: PublicKey,
    connection: Connection,
    wallet: WalletAdapter | undefined
  ) {
    this.progStateAccount = progStateAccount;
    this.progId = progId;
    this.state = null;
    this.connection = connection;
    this.wallet = wallet;
  }

  public registerCall(
    instructions: TransactionInstruction[],
    args: RegisterCallArgs
  ) {
    if (!this.wallet) {
      alert("please connect your wallet first")
      return
    }
    let wcall: any;
    if (
      args.wcall.type === WCallTypes.Chained &&
      isWCallChained(args.wcall.data)
    ) {
      const callData = args.wcall.data as WCallChained;
      wcall = {
        Chained: [
          serializePubkey(callData.wcall),
          callData.callback_basket
        ]
      };
    } else if (
      args.wcall.type === WCallTypes.Simple &&
      isWCallSimple(args.wcall.data)
    ) {
      wcall = { Simple: serializePubkey(args.wcall.data as PublicKey) };
    } else {
      throw "Invalid WCall type and args";
    }
    const sending_args = {
      call_input: args.call_input,
      call_name: args.call_name,
      wcall,
    };
    instructions.push(
      new TransactionInstruction({
        keys: [
          {
            isWritable: true,
            pubkey: this.progStateAccount,
            isSigner: false,
          },
          {
            isWritable: false,
            pubkey: this.wallet.publicKey as PublicKey,
            isSigner: true
          },
        ],
        programId: this.progId,
        data: Buffer.from(JSON.stringify({ RegisterCall: sending_args })),
      })
    );
  }

  private parseAccountState(data: Buffer): MallocState {
    const buf = trimBuffer(data)
    const bufString = buf.toString();
    console.log(data)
    const state = JSON.parse(bufString);
    console.log(state);
    return state;
  }

  public async refresh() {
    if (!this.state) {
      this.state = {
        wrapped_calls: {},
        baskets: {},
        supported_wrapped_call_inputs: {},
      };
    }

    const accountInfo = await this.connection.getAccountInfo(this.progStateAccount);
    console.log(accountInfo)
    if (!accountInfo) {
      console.error(`accountInfo for ${this.progStateAccount} DNE!`);
      return;
    }
    this.state = this.parseAccountState(accountInfo.data);
  }

  public checkCallGraph(basket: BasketNode, depth = 4): boolean {
    // check max recursion depth
    if (depth === 0) {
      return false;
    }
    // check that splits sum to right number
    const sum = basket.splits.reduce((sum, split) => sum + split, 0);
    if (sum !== SPLIT_SUM) {
      return false
    }
    // check basket inputs and outputs
    return basket.calls.every(call => {
      if (isWCallChained(call)) {
        const state = this.state as MallocState;
        const basketInput = state.baskets[basket.name].input;
        const callState = state.wrapped_calls[call.name].data as WCallChained;
        const callOutput = callState.output;
        const callInput = state.supported_wrapped_call_inputs[call.name];
        const callbackBasketInput = state
          .baskets[callState.callback_basket].input;

        return callInput === basketInput
          && callOutput === callbackBasketInput
          && this.checkCallGraph(
            (call as WCallChainedNode).callbackBasket,
            depth - 1
          );

      } else {
        const state = this.state as MallocState;
        const basketInput = state.baskets[basket.name].input;
        const callInput = state.supported_wrapped_call_inputs[call.name];
        return basketInput === callInput;
      }
    })
  }

    

  public getCallGraph(basketName: string): BasketNode {
    if (!this.state) {
      throw new Error("state not initialized!");
    }
    const basket = this.state.baskets[basketName];
    return {
      name: basketName,
      splits: basket.splits,
      calls: basket.calls.map((callName) => {
        const callDescriptor = (this.state as MallocState).wrapped_calls[
          callName
        ];
        switch (callDescriptor.type) {
          case "Chained": {
            const callData = callDescriptor.data as WCallChained;
            return {
              name: callName,
              wcall: callData.wcall,
              output: callData.output,
              callBackBasket: this.getCallGraph(callData.callback_basket),
            };
          }
          default: {
            // "Simple"
            const callData = callDescriptor.data as WCallSimple;
            return {
              name: callName,
              wcall: callData
            };
          }
        }
      }),
    };
  }

  createBasket(args: CreateBasketArgs) {
    // TODO: implement
  }
  enactBasket(args: EnactBasketArgs) {
    // TODO: implement
  }
  public async sendMallocTransaction(instructions: TransactionInstruction[]) {
    if (!this.wallet) {
      alert("please connect your wallet first")
      return;
    }
    console.log(
      "Sending transaction with instruction data",
      instructions.map((inst) => new TextDecoder("utf-8").decode(inst.data))
    );
    sendTransaction(this.connection, this.wallet, instructions, []);
  }
}
