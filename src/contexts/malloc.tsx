import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  Connection,
} from "@solana/web3.js";
import React, { useContext, useEffect, useMemo } from "react";
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
  CreateBasketArgs,
  EnactBasketArgs,
  InitMallocArgs,
  Basket,
  MallocState,
} from "../models/malloc";
import { serializePubkey } from "../utils/utils";

const PROGRAM_STATE_ADDR = new PublicKey(
  require("../config/data_account.json").data_account_address
);
const PROGRAM_ID = new PublicKey(
  require("../config/program_id.json").programId
);
const REFRESH_INTERVAL = 1000;
const MallocContext = React.createContext<Malloc | null>(null);

export function MallocProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();
  const connection = useMemo(() => new Connection(endpoint, "recent"), [
    endpoint,
  ]);
  const { wallet } = useWallet();
  const malloc = useMemo(
    () => new Malloc(PROGRAM_STATE_ADDR, PROGRAM_ID, connection, wallet),
    [connection, wallet]
  );

  useEffect(() => {
    let timer = 0;

    const updateMalloc = async () => {
      await malloc.refresh();

      timer = window.setTimeout(() => updateMalloc, REFRESH_INTERVAL);
    };

    updateMalloc();

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

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

  public async getState() {
    const accountInfo = await this.connection.getAccountInfoAndContext(
      this.progStateAccount
    );
    console.log(accountInfo?.value?.data);
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
      wcall = {
        Chained: ((args.wcall.data as any) as PublicKey[]).map((k) =>
          serializePubkey(k)
        ), //.toBase58()),
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
    const bufString = data.toString();
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

    const accountInfo = await this.connection.getAccountInfo(
      this.progStateAccount,
      "single"
    );
    if (!accountInfo) {
      console.error(`accountInfo for ${this.progStateAccount} DNE!`);
      return;
    }
    this.state = this.parseAccountState(accountInfo.data);
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
          case "Chained":
            const callData = callDescriptor.data as WCallChained;
            return {
              name: callName,
              wcall: callData.wcall,
              callBackBasket: this.getCallGraph(callData.callbackBasket),
            };
          default:
            // "Simple"
            const callAddr = callDescriptor.data as PublicKey;
            return {
              name: callName,
              wcall: callAddr,
            };
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

export function useMalloc() {
  const malloc = useContext(MallocContext);
  return malloc;
}
