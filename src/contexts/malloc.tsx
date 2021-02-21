import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  Connection,
} from "@solana/web3.js";
import {assert} from "console";
import React, {useEffect, useMemo} from "react";
import { useConnectionConfig, sendTransaction } from "../contexts/connection";
import { WalletAdapter } from "../contexts/wallet";
import {
  RegisterCallArgs,
  WCallTypes,
  BasketNode,
  WCallSimple,
  WCallChained,
  isWCallChained,
  isWCallSimple,
  CreateBasketArgs,
  EnactBasketArgs,
  InitMallocArgs,
  Basket,
  MallocState,
} from "../models/malloc";

const PROGRAM_ID = new PublicKey("hi");
const REFRESH_INTERVAL = 1000;
const MallocContext = React.createContext<Malloc | null>(null);

export function MallocProvider({ children = null as any}) {
  const { endpoint } = useConnectionConfig();
  const connection = useMemo(() => new Connection(endpoint, "recent"), [ endpoint ]);
  const malloc = useMemo(() => new Malloc(PROGRAM_ID, PROGRAM_ID, connection), [])
  
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
  }, []);

  return (
    <MallocContext.Provider
      value={malloc}
    >
      {children}
    </MallocContext.Provider>
  );
}

class Malloc {
  private progStateAccount: PublicKey;
  private progId: PublicKey;
  private connection: Connection;
  private state: MallocState | null;

  constructor(_prog_state_account: PublicKey, _prog_id: PublicKey, connection: Connection) {
    this.progStateAccount = _prog_state_account;
    this.progId = _prog_id;
    this.state = null;
    this.connection = connection;
  }

  public registerCall(
    instructions: TransactionInstruction[],
    args: RegisterCallArgs
  ) {
    let wcall: any;
    if (
      args.wcall.type === WCallTypes.Chained &&
      isWCallChained(args.wcall.data)
    ) {
      const chainedCall = args.wcall.data as WCallChained;
      wcall = {
        chained: [chainedCall.wcall.toBase58(), chainedCall.callbackBasket],
      };
    } else if (
      args.wcall.type === WCallTypes.Simple &&
      isWCallSimple(args.wcall.data)
    ) {
      wcall = { simple: (args.wcall.data as PublicKey).toBase58() };
    } else {
      throw new Error("Invalid WCall type and args");
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
        ],
        programId: this.progId,
        data: Buffer.from(JSON.stringify(sending_args)),
      })
    );
  }

  private parseAccountState(data: Buffer): MallocState {
    const bufString = data.toString();
    const state = JSON.parse(bufString);
    console.log(state);
    return state
  }

  public async refresh() {
    if (!this.state) {
      this.state = {
        wrapped_calls: {},
        baskets: {},
        supported_wrapped_call_inputs: {}
      }
    }

    const accountInfo = await this.connection.getAccountInfo(this.progStateAccount, "single");
    if (!accountInfo) {
      console.error(`accountInfo for ${this.progStateAccount} DNE!`);
      return;
    }
    assert(accountInfo.owner === this.progStateAccount);
    assert(accountInfo.executable);
    this.state = this.parseAccountState(accountInfo.data);
  }

  public getCallGraph(basketName: string): BasketNode {
    if (!this.state) {
      throw new Error("state not initialized!")
    }
    const basket = this.state.baskets[basketName];
    return { 
      name: basketName,
      splits: basket.splits,
      calls: basket.calls.map(callName => {
        const callDescriptor = (this.state as MallocState).wrapped_calls[callName];
        switch (callDescriptor.type) {
          case "Chained":
            const callData = callDescriptor.data as WCallChained;
            return {
              name: callName,
              wcall: callData.wcall,
              callBackBasket: this.getCallGraph(callData.callbackBasket)
            }
          default: // "Simple"
            const callAddr = callDescriptor.data as PublicKey;
            return {
              name: callName,
              wcall: callAddr
            }
        }
      })
    }
  }

  createBasket(args: CreateBasketArgs) {
    // TODO: implement
  }
  enactBasket(args: EnactBasketArgs) {
    // TODO: implement
  }
  public async sendMallocTransaction(
    wallet: WalletAdapter,
    instructions: TransactionInstruction[]
  ) {
    console.log(
      "Sending transaction with instruction data",
      instructions.map((inst) => new TextDecoder("utf-8").decode(inst.data))
    );
    sendTransaction(this.connection, wallet, instructions, []);
  }
}
