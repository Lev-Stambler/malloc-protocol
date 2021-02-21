import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  Connection,
} from "@solana/web3.js";
import { sendTransaction } from "../contexts/connection";
import { WalletAdapter } from "../contexts/wallet";
import {
  RegisterCallArgs,
  WCallTypes,
  WCallSimple,
  WCallChained,
  isWCallChained,
  isWCallSimple,
  CreateBasketArgs,
  EnactBasketArgs,
  InitMallocArgs,
} from "../models/malloc";
import { serializePubkey } from "../utils/utils";

export class Malloc {
  private progStateAccount: PublicKey;
  private progId: PublicKey;

  constructor(_prog_state_account: PublicKey, _prog_id: PublicKey) {
    this.progStateAccount = _prog_state_account;
    this.progId = _prog_id;
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
      wcall = {
        Chained: (args.wcall.data as PublicKey[]).map((k) => serializePubkey(k)), //.toBase58()),
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
        ],
        programId: this.progId,
        data: Buffer.from(JSON.stringify({ RegisterCall: sending_args })),
      })
    );
  }
  createBasket(args: CreateBasketArgs) {
    // TODO: implement
  }
  enactBasket(args: EnactBasketArgs) {
    // TODO: implement
  }
  public async sendMallocTransaction(
    connection: Connection,
    wallet: WalletAdapter,
    instructions: TransactionInstruction[]
  ) {
    console.log(
      "Sending transaction with instruction data",
      instructions.map((inst) => new TextDecoder("utf-8").decode(inst.data))
    );
    sendTransaction(connection, wallet, instructions, []);
  }
}
