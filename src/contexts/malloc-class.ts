import {
  PublicKey,
  TransactionInstruction,
  Account,
  Connection,
  AccountMeta,
} from "@solana/web3.js";
import { sign } from "crypto";
import {
  createTokenAccount,
  DEFAULT_TEMP_MEM_SPACE,
  findOrCreateAccountByMint,
} from "../actions/account";
import { approve, transfer } from "../models";
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
import { TOKEN_PROGRAM_ID } from "../utils/ids";
import { serializePubkey, trimBuffer } from "../utils/utils";
import { sendTransaction } from "./connection";
import { WalletAdapter } from "./wallet";

export class Malloc {
  private progStateAccount: PublicKey;
  private progId: PublicKey;
  private connection: Connection;
  private wallet: WalletAdapter | undefined;
  private userPubKeyAlt: PublicKey | undefined;
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

  public setUserPubKeyAlt(pubkey: PublicKey) {
    this.userPubKeyAlt = pubkey;
  }

  public registerCall(args: RegisterCallArgs) {
    if (!this.wallet) {
      alert("please connect your wallet first");
      throw new Error("wallet not connected");
    }

    let wcall: any;

    if (args.wcall.hasOwnProperty("Simple")) {
      wcall = args.wcall as { Simple: WCallSimple<number[]> };
      wcall.Simple.wcall = wcall.Simple.wcall;
    } else {
      wcall = args.wcall as { Chained: WCallChained<number[]> };
      wcall.Chained.wcall = wcall.Chained.wcall;
    }

    const sending_args = {
      call_name: args.call_name,
      wcall_enum: wcall,
    };

    return new TransactionInstruction({
      keys: [
        {
          isWritable: true,
          pubkey: this.progStateAccount,
          isSigner: false,
        },
        {
          isWritable: true,
          pubkey: (this.wallet?.publicKey || this.userPubKeyAlt) as PublicKey,
          isSigner: true,
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
            pubkey: (this.wallet?.publicKey || this.userPubKeyAlt) as PublicKey,
            isSigner: true,
          },
        ],
        programId: this.progId,
        data: Buffer.from(JSON.stringify({ NewSupportedWCallInput: args })),
      })
    );
  }

  private convertObjToHavePubKey(state: any) {
    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) {
      if (
        state[keys[i]] instanceof Array &&
        state[keys[i]].length === 32 &&
        typeof state[keys[i]][0] === "number"
      ) {
        state[keys[i]] = new PublicKey(state[keys[i]]);
      } else if (typeof state[keys[i]] === "object") {
        this.convertObjToHavePubKey(state[keys[i]]);
      }
    }
  }

  // TODO: if you are a PublicKey type convert from the number[] PublicKey
  private parseAccountState(data: Buffer): MallocState {
    const buf = trimBuffer(data);
    const bufString = buf.toString();
    const state = JSON.parse(bufString);
    this.convertObjToHavePubKey(state);
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
              Chained: {
                wcall: serializePubkey(callNode.wcall),
                callback_basket: callNode.callbackBasket.name,
                output: callNode.output,
                input: callNode.input,
                associated_accounts: callNode.associateAccounts.map((k) =>
                  serializePubkey(k)
                ),
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
              Simple: {
                wcall: serializePubkey(callNode.wcall),
                input: callNode.input,
                associated_accounts: callNode.associateAccounts.map((k) =>
                  serializePubkey(k)
                ),
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
  ): WCallChained<PublicKey> | WCallSimple<PublicKey> {
    const data = (this.state as MallocState).wrapped_calls[callNode.name];
    if ((data as any).Chained) return (data as any).Chained;
    return (data as any).Simple as WCallSimple<PublicKey>;
  }

  private getInputMint(inputName: string): PublicKey {
    return (this.state as MallocState).supported_wrapped_call_inputs[inputName];
  }

  private getAccountMetasFromCallGraphHelper(
    basket: BasketNode,
    ephemeralAccounts: Account[],
    initEphemeralAccountInstsructions: TransactionInstruction[],
    rent: number,
    accountMetas: AccountMeta[]
  ) {
    const mint = this.getInputMint(basket.input);

    basket.calls.forEach((call) => {
      // call's program account
      accountMetas.push({
        pubkey: call.wcall,
        isSigner: false,
        isWritable: true,
      });

      const callData = this.getStateCallFromNode(call);

      // call's split account
      let signers: Account[] = [];
      const ephemeralAccountPubKey = createTokenAccount(
        initEphemeralAccountInstsructions,
        this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
        rent,
        mint,
        this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
        signers
      );
      if (
        signers[0].publicKey.toBase58() !== ephemeralAccountPubKey.toBase58()
      ) {
        throw Error("ephemeralAccount not created properly!");
      }
      ephemeralAccounts.push(signers[0]);
      accountMetas.push({
        pubkey: ephemeralAccountPubKey,
        isWritable: true,
        isSigner: true,
      });

      // call's associated accounts
      const associated_accounts = callData.associated_accounts;
      accountMetas.push(
        ...associated_accounts.map((key) => ({
          pubkey: key,
          isWritable: true,
          isSigner: false,
        }))
      );

      if (isWCallChained(callData)) {
        // get output account, if it demands one
        const mint = this.getInputMint((call as WCallChainedNode).output);
        let signers: Account[] = [];
        const ephemeralAccountPubKey = createTokenAccount(
          initEphemeralAccountInstsructions,
          this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
          rent,
          mint,
          this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
          signers
        );
        if (signers[0].publicKey !== ephemeralAccountPubKey) {
          throw Error("ephemeralAccount not created properly!");
        }
        ephemeralAccounts.push(signers[0]);
        accountMetas.push({
          pubkey: ephemeralAccountPubKey,
          isWritable: true,
          isSigner: true,
        });

        // recurse
        this.getAccountMetasFromCallGraphHelper(
          (call as WCallChainedNode).callbackBasket,
          ephemeralAccounts,
          initEphemeralAccountInstsructions,
          rent,
          accountMetas
        );
      }
    });
  }

  public setupInvokeCallGraph(
    basket: BasketNode,
    mallocInputPubkey: PublicKey,
    mintPubkey: PublicKey,
    rent: number
  ): {
    accountMetas: AccountMeta[];
    ephemeralAccounts: Account[];
    initEphemeralAccountInstsructions: TransactionInstruction[];
  } | null {
    if (!this.checkCallGraph(basket)) {
      alert("invalid call graph!");
      return null;
    }

    const accountMetas: AccountMeta[] = [];
    const ephemeralAccounts: Account[] = [];
    const initEphemeralAccountInstsructions: TransactionInstruction[] = [];

    accountMetas.push({
      pubkey: mallocInputPubkey,
      isWritable: true,
      isSigner: true,
    });

    accountMetas.push({
      pubkey: mintPubkey,
      isWritable: false,
      isSigner: false,
    })
    const ephemeralAccountRent = rent;
    this.getAccountMetasFromCallGraphHelper(
      basket,
      ephemeralAccounts,
      initEphemeralAccountInstsructions,
      rent,
      accountMetas
    );

    return {
      accountMetas,
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
    let newAccounts: Account[] = [];
    const mintPubkey = this.state?.supported_wrapped_call_inputs[basket.input] as PublicKey
    const mallocInputPubkey = createTokenAccount(
      instructions,
      this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
      rent,
      mintPubkey,
      this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
      newAccounts
    );
    // Changed to transfer
    // approve(
    //   instructions,
    //   [],
    //   userInputPubKey,
    //   this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
    //   amount,
    //   false,
    //   mallocInputPubkey
    // );
    transfer(
      instructions,
      [],
      userInputPubKey,
      this.wallet?.publicKey || (this.userPubKeyAlt as PublicKey),
      mallocInputPubkey,
      amount,
      newAccounts
    );

    const setupResult = this.setupInvokeCallGraph(
      basket,
      mallocInputPubkey,
      mintPubkey,
      rent
    );
    if (!setupResult) {
      return [];
    }

    const {
      accountMetas,
      ephemeralAccounts,
      initEphemeralAccountInstsructions,
    } = setupResult;

    newAccounts.push(...ephemeralAccounts);

    instructions.push(...initEphemeralAccountInstsructions);

    instructions.push(
      this.enactBasket({ basket_name: basket.name, rent_given: rent }, accountMetas)
    );

    return newAccounts;
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
            const callData = (callDescriptor as any)
              .Chained as WCallChained<PublicKey>;
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
            const callData = (callDescriptor as any)
              .Simple as WCallSimple<PublicKey>;
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
      throw new Error("wallet not connected");
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
          pubkey: ((this.wallet as any) as WalletAdapter)
            .publicKey as PublicKey,
          isSigner: true,
        },
      ],
      programId: this.progId,
      data: Buffer.from(JSON.stringify({ createBasket: args })),
    });
  }

  enactBasket(args: EnactBasketArgs, requiredAccountMetas: AccountMeta[]) {
    // if (!this.wallet) {
    //   alert("please connect your wallet first");
    //   throw "wallet not connected";
    // }
    const progStateMeta = {
      isWritable: true,
      pubkey: this.progStateAccount,
      isSigner: false,
    };

    const walletMeta = {
      isWritable: true,
      pubkey: (this.wallet?.publicKey || this.userPubKeyAlt) as PublicKey,
      isSigner: true,
    };

    const splMeta = {
      isWritable: false,
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false
    }

    return new TransactionInstruction({
      keys: [progStateMeta, walletMeta, splMeta, ...requiredAccountMetas],
      programId: this.progId,
      data: Buffer.from(JSON.stringify({ EnactBasket: args })),
    });
  }

  public async sendMallocTransaction(
    instructions: TransactionInstruction[],
    signers: Account[]
  ) {
    if (!this.wallet) {
      alert("please connect your wallet first");
      return;
    }
    console.log(
      "Sending transaction with instruction data",
      instructions.map((inst) => new TextDecoder("utf-8").decode(inst.data))
    );
    await sendTransaction(this.connection, this.wallet, instructions, signers);
    await this.refresh();
  }
}
