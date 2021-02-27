import React, { useCallback } from "react";
import { useConnection } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { Button } from "antd"
import { LABELS } from "../../constants";

export const FaucetView = () => {
  const connection = useConnection();
  const { connected, publicKey } = useWallet();

  const airdrop = useCallback(() => {
    if (!connected || !publicKey) {
      return;
    }

    connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL).then(() => {
      notify({
        message: LABELS.ACCOUNT_FUNDED,
        type: "success",
      });
    });
  }, [publicKey, connection]);

  let faucetInfo = LABELS.FAUCET_INFO;
  if (!connected) {
    faucetInfo += " Please connect a Solana wallet to continue.";
  }

  return (
    <div className="flex flex-row justify-around">
      <div className="flex flex-col px-10 items-center">
        <div className="py-4">
            {faucetInfo}
        </div>
        <div className="py-4">
          { connected ? (
            <Button type="primary" onClick={airdrop}>{LABELS.GIVE_SOL}</Button>
          ) : <></>}
        </div>
      </div>
    </div>
  );
};
