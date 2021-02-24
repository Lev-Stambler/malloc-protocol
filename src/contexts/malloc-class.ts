import {
  PublicKey,
  TransactionInstruction,
  Account,
  Connection,
} from "@solana/web3.js";
import { sign } from "crypto";
import { createTokenAccount, DEFAULT_TEMP_MEM_SPACE } from "../actions/account";
import { approve } from "../models";
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
  NewSupportedWCallInput,
} from "../models/malloc";
import { serializePubkey, trimBuffer } from "../utils/utils";
import { sendTransaction } from "./connection";
import { WalletAdapter } from "./wallet";

export class Malloc {
  private progStateAccount: PublicKey;
  private progId: PublicKey;
  private connection: Connection;
  private wallet: WalletAdapter | undefined;
  private state: MallocState | undefined;
  private tokenAccounts: any;
  private nativeAccounts: any;

  constructor(
    progStateAccount: PublicKey,
    progId: PublicKey,
    connection: Connection,
    wallet: WalletAdapter | undefined,
    accountsContext: any
  ) {
    this.progStateAccount = progStateAccount;
    this.progId = progId;
    this.connection = connection;
    this.wallet = wallet;
    this.tokenAccounts = accountsContext.userAccounts;
    this.nativeAccounts = accountsContext.nativeAccounts;
  }

  public registerCall(args: RegisterCallArgs) {
    if (!this.wallet) {
      alert("please connect your wallet first");
      throw "wallet not connected";
    }
    let wcall: any;
    if (
      args.wcall.type === WCallTypes.Chained &&
      isWCallChained(args.wcall.data)
    ) {
      wcall = {
        Chained: {
          ...args.wcall.data,
          wcall: serializePubkey(args.wcall.data.wcall as PublicKey),
        },
      };
    } else if (
      args.wcall.type === WCallTypes.Simple &&
      isWCallSimple(args.wcall.data)
    ) {
      wcall = {
        Chained: {
          ...args.wcall.data,
          wcall: serializePubkey(args.wcall.data.wcall as PublicKey),
        },
      };
    } else {
      throw "Invalid WCall type and args";
    }
    const sending_args = {
      call_name: args.call_name,
      wcall_enum: wcall,
    };
    return new TransactionInstruction({
      keys: [
        {
          isWritable: false,
          pubkey: this.wallet.publicKey as PublicKey,
          isSigner: true,
        },
        {
          isWritable: true,
          pubkey: this.progStateAccount,
          isSigner: false,
        },
      ],
      programId: this.progId,
      data: Buffer.from(JSON.stringify({ RegisterCall: sending_args })),
    });
  }

  public registerNewSupportedWCall(
    instructions: TransactionInstruction[],
    args: NewSupportedWCallInput
  ) {
    if (!this.wallet) {
      alert("please connect your wallet first");
      return;
    }
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
            isSigner: true,
          },
        ],
        programId: this.progId,
        data: Buffer.from(JSON.stringify({ NewSupportedWCallInput: args })),
      })
    );
  }

  private parseAccountState(data: Buffer): MallocState {
    const buf = trimBuffer(data);
    const bufString = buf.toString();
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
      this.progStateAccount
    );
    console.log(accountInfo);
    if (!accountInfo) {
      console.error(`accountInfo for ${this.progStateAccount} DNE!`);
      return;
    }
    this.state = this.parseAccountState(accountInfo.data);
  }

  callGraphToTransactionsHelper(
    basket: BasketNode,
    transactions: TransactionInstruction[]
  ) {
    basket.calls.forEach((call) => {
      if (this.state?.wrapped_calls[call.name]) {
        return;
      }
      if (isWCallChained(call)) {
        const callNode = call as WCallChainedNode;
        this.callGraphToTransactionsHelper(
          callNode.callbackBasket,
          transactions
        );
        transactions.push(
          this.registerCall({
            call_name: callNode.name,
            wcall: {
              type: WCallTypes.Chained,
              data: {
                wcall: callNode.wcall,
                callback_basket: callNode.callbackBasket.name,
                output: callNode.output,
                input: callNode.input,
                associated_accounts: callNode.associateAccounts,
              },
            },
          })
        );
      } else {
        const callNode = call as WCallSimpleNode;
        transactions.push(
          this.registerCall({
            call_name: callNode.name,
            wcall: {
              type: WCallTypes.Simple,
              data: {
                wcall: callNode.wcall,
                input: callNode.input,
                associated_accounts: callNode.associateAccounts,
              },
            },
          })
        );
      }
    });

    if (!this.state?.baskets[basket.name]) {
      transactions.push(
        this.createBasket({
          name: basket.name,
          calls: basket.calls.map((call) => call.name),
          splits: basket.splits,
          input: basket.input,
        })
      );
    }
  }

  public callGraphToTransactions(basket: BasketNode): TransactionInstruction[] {
    if (!this.state) {
      throw new Error("state not initialized!");
    }
    if (!this.checkCallGraph(basket)) {
      console.log("invalid call graph!");
      return [];
    }

    let transactions: TransactionInstruction[] = [];
    this.callGraphToTransactionsHelper(basket, transactions);
    console.log("transactions:", transactions);
    return transactions;
  }

  public checkCallGraph(basket: BasketNode, depth = 4): boolean {
    // check max recursion depth
    if (depth === 0) {
      return false;
    }
    // check that splits sum to right number
    const sum = basket.splits.reduce((sum, split) => sum + split, 0);
    if (sum !== SPLIT_SUM) {
      return false;
    }
    // check basket inputs and outputs
    return basket.calls.every((call) => {
      if (isWCallChained(call)) {
        const callData = call as WCallChainedNode;
        const basketInput = this.state?.baskets[basket.name].input;
        const callbackBasketInput = callData.callbackBasket.input;

        return (
          callData.input === basketInput &&
          callData.output === callbackBasketInput &&
          this.checkCallGraph(
            (call as WCallChainedNode).callbackBasket,
            depth - 1
          )
        );
      } else {
        const state = this.state as MallocState;
        const basketInput = state.baskets[basket.name].input;
        return basketInput === call.input;
      }
    });
  }

  private getStateCallFromNode(
    callNode: WCallChainedNode | WCallSimpleNode
  ): WCallChained | WCallSimple {
    const data = (this.state as MallocState).wrapped_calls[callNode.name];
    if ((data as any).Chained) return (data as any).Chained as WCallChained;
    return (data as any).Simple as WCallSimple;
  }

  private getInputMint(inputName: string): PublicKey {
    return (this.state as MallocState).supported_wrapped_call_inputs[inputName];
  }

  private getAccountInfoFromCallGraphHelper(
    basket: BasketNode,
    ephemeralAccounts: Account[],
    initEphemeralAccountInstsructions: TransactionInstruction[],
    rent: number,
    accountPubKeys: PublicKey[]
  ) {
    const mint = this.getInputMint(basket.input);

    basket.calls.forEach((call) => {
      // call's program account
      accountPubKeys.push(call.wcall);

      const callData = this.getStateCallFromNode(call);

      // call's split account
      let signers: Account[] = [];
      const ephemeralAccountPubKey = createTokenAccount(
        initEphemeralAccountInstsructions,
        this.wallet?.publicKey as PublicKey,
        rent,
        mint,
        this.wallet?.publicKey as PublicKey,
        signers
      );
      if (
        signers[0].publicKey.toBase58() !== ephemeralAccountPubKey.toBase58()
      ) {
        throw Error("ephemeralAccount not created properly!");
      }
      ephemeralAccounts.push(signers[0]);
      accountPubKeys.push(ephemeralAccountPubKey);

      // call's associated accounts
      accountPubKeys.push(...callData.associated_accounts);

      if (isWCallChained(callData)) {
        // get output account, if it demands one
        const mint = this.getInputMint((call as WCallChainedNode).output);
        let signers: Account[] = [];
        const ephemeralAccountPubKey = createTokenAccount(
          initEphemeralAccountInstsructions,
          this.wallet?.publicKey as PublicKey,
          rent,
          mint,
          this.wallet?.publicKey as PublicKey,
          signers
        );
        if (signers[0].publicKey !== ephemeralAccountPubKey) {
          throw Error("ephemeralAccount not created properly!");
        }
        ephemeralAccounts.push(signers[0]);
        accountPubKeys.push(ephemeralAccountPubKey);

        // recurse
        this.getAccountInfoFromCallGraphHelper(
          (call as WCallChainedNode).callbackBasket,
          ephemeralAccounts,
          initEphemeralAccountInstsructions,
          rent,
          accountPubKeys
        );
      }
    });
  }

  public setupInvokeCallGraph(
    basket: BasketNode,
    mallocInputPubkey: PublicKey,
    rent: number
  ): {
    accountPubKeys: PublicKey[];
    ephemeralAccounts: Account[];
    initEphemeralAccountInstsructions: TransactionInstruction[];
  } | null {
    if (!this.checkCallGraph(basket)) {
      alert("invalid call graph!");
      return null;
    }

    const accountPubKeys: PublicKey[] = [];
    const ephemeralAccounts: Account[] = [];
    const initEphemeralAccountInstsructions: TransactionInstruction[] = [];

    accountPubKeys.push(mallocInputPubkey);

    this.getAccountInfoFromCallGraphHelper(
      basket,
      ephemeralAccounts,
      initEphemeralAccountInstsructions,
      rent,
      accountPubKeys
    );

    return {
      accountPubKeys,
      ephemeralAccounts,
      initEphemeralAccountInstsructions,
    };
  }

  // returns the ephemeral accounts to empty later
  public invokeCallGraph(
    instructions: TransactionInstruction[],
    basket: BasketNode,
    userInputPubKey: PublicKey,
    rent: number,
    amount: number
  ): Account[] {
    const mallocInputPubKey = approve(
      instructions,
      [],
      userInputPubKey,
      (this.wallet as any as WalletAdapter).publicKey as PublicKey,
      amount,
      false
    );
    
    const setupResult = this.setupInvokeCallGraph(basket, mallocInputPubKey.publicKey, rent);
    if (!setupResult) {
      return [];
    }

    const {
      accountPubKeys,
      ephemeralAccounts,
      initEphemeralAccountInstsructions,
    } = setupResult;

    instructions.push(...initEphemeralAccountInstsructions);

    instructions.push(
      this.enactBasket({ basket_name: basket.name }, accountPubKeys)
    );

    return ephemeralAccounts;
  }

  public async getEphemeralAccountRent() {
    return this.connection.getMinimumBalanceForRentExemption(
      DEFAULT_TEMP_MEM_SPACE
    );
  }

  public getCallGraph(basketName: string): BasketNode {
    if (!this.state) {
      throw new Error("state not initialized!");
    }
    const basket = this.state.baskets[basketName];
    return {
      name: basketName,
      splits: basket.splits,
      input: basket.input,
      calls: basket.calls.map((callName) => {
        const callDescriptor = (this.state as MallocState).wrapped_calls[
          callName
        ];
        const callDescriptorType = (callDescriptor as any).Chained
          ? WCallTypes.Chained
          : WCallTypes.Simple;
        switch (callDescriptorType) {
          case WCallTypes.Chained: {
            const callData = (callDescriptor as any).Chained as WCallChained;
            return {
              name: callName,
              wcall: callData.wcall,
              input: callData.input,
              output: callData.output,
              callbackBasket: this.getCallGraph(callData.callback_basket),
            } as WCallChainedNode;
          }
          default: {
            // "Simple"
            const callData = (callDescriptor as any).Simple as WCallSimple;
            return {
              name: callName,
              input: callData.input,
              wcall: callData.wcall,
            } as WCallSimpleNode;
          }
        }
      }),
    };
  }

  createBasket(args: CreateBasketArgs) {
    if (!this.wallet) {
      alert("please connect your wallet first");
      throw "wallet not connected";
    }
    return new TransactionInstruction({
      keys: [
        {
          isWritable: true,
          pubkey: this.progStateAccount,
          isSigner: false,
        },
        {
          isWritable: false,
          pubkey: this.wallet.publicKey as PublicKey,
          isSigner: true,
        },
      ],
      programId: this.progId,
      data: Buffer.from(JSON.stringify({ createBasket: args })),
    });
  }

  enactBasket(args: EnactBasketArgs, requiredAccountKeys: PublicKey[]) {
    // if (!this.wallet) {
    //   alert("please connect your wallet first");
    //   throw "wallet not connected";
    // }
    return new TransactionInstruction({
      keys: [
        this.progStateAccount,
        (this.wallet as WalletAdapter).publicKey as PublicKey,
        ...requiredAccountKeys,
      ].map((key) => ({
        isWritable: true,
        pubkey: key,
        isSigner: false,
      })),
      programId: this.progId,
      data: Buffer.from(JSON.stringify({ enactBasket: args })),
    });
  }

  public async sendMallocTransaction(instructions: TransactionInstruction[]) {
    if (!this.wallet) {
      alert("please connect your wallet first");
      return;
    }
    console.log(
      "Sending transaction with instruction data",
      instructions.map((inst) => new TextDecoder("utf-8").decode(inst.data))
    );
    await sendTransaction(this.connection, this.wallet, instructions, []);
    await this.refresh();
  }
}
