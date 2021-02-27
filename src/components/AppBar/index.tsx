import React from "react";
import { Button, Popover } from "antd";
import { useWallet } from "../../contexts/wallet";
import { CurrentUserBadge } from "../CurrentUserBadge";
import { SettingOutlined } from "@ant-design/icons";
import { Settings } from "../Settings";
import { LABELS } from "../../constants";
import { ConnectButton } from "../ConnectButton";

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const { connected } = useWallet();

  const TopBar = (
    <div className="flex flex-row justify-items-end max-h-full w-full place-content-center">
      <div className="flex flex-col flex-grow justify-self-start text-align-left px-8">
        <h2>Malloc Protocol</h2>
      </div>
      <div className="flex flex-col px-4 justify-items-center">
        <div className="flex-grow">
          {connected ? (
            <CurrentUserBadge/>
          ) : (
            <ConnectButton
              type="text"
              size="large"
              allowWalletChange={true}
              style={{ color: "#2abdd2" }}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col px-2">
        <div className="flex-grow">
          <Popover
            placement="topRight"
            title={LABELS.SETTINGS_TOOLTIP}
            content={<Settings />}
            trigger="click"
          >
            <Button
              shape="circle"
              size="large"
              type="text"
              icon={<SettingOutlined/>}
            />
          </Popover>
        </div>
      </div>
      <div className="flex flex-col justify-items-center">
        {props.right}
      </div>
    </div>
  );

  return TopBar;
};
