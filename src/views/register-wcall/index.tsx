import React, { useCallback } from "react";
import { useConnection } from "../../contexts/connection";
import { useWallet, WalletProvider } from "../../contexts/wallet";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import { Button } from "antd";
import { Malloc } from "../../actions/malloc";
import { WCallTypes } from "../../models/malloc";

export const RegisterWCallView = () => {
  const connection = useConnection();

  const { wallet } = useWallet();
  const registerDummyWcall = useCallback(async () => {
    console.log("register dummy");
    const malloc = new Malloc(
      new PublicKey("66gbNEJwdTNqd7tqedB4z7DRMAeSHugthXMYvibyJ9DN"),
      new PublicKey("25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr")
    );
    const insts: TransactionInstruction[] = [];
    malloc.registerCall(insts, {
      call_input: "Eth",
      call_name: "Yo Mom",
      wcall: {
        type: WCallTypes.Simple,
        data: new PublicKey("66gbNEJwdTNqd7tqedB4z7DRMAeSHugthXMYvibyJ9DN"),
      },
    });
    console.log(wallet);
    if (wallet !== undefined)
      await malloc.sendMallocTransaction(connection, wallet, insts);
  }, [wallet, connection]);

  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <Button type="primary" onClick={registerDummyWcall}>
          Register Dummy
        </Button>
      </div>
    </div>
  );
};
