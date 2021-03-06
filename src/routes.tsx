import { HashRouter, Route, Switch } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { MarketProvider } from "./contexts/market";
import { MallocProvider } from "./contexts/malloc";
import { DiagramProvider } from "./contexts/diagram";
import { AppLayout } from "./components/Layout";

import { FaucetView, HomeView, RegisterWCallView, CallGraphView, InfoView } from "./views";

export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <MallocProvider>
                <MarketProvider>
                  <DiagramProvider>
                    <AppLayout>
                      <Switch>
                        <Route exact path="/" component={() => <HomeView />} />
                        <Route exact path="/faucet" children={<FaucetView />} />
                        <Route exact path="/graph/:topLevelBasketId" children={<CallGraphView />} />
                        <Route exact path="/register-wcall" children={<RegisterWCallView />} />
                        <Route exact path="/ultralitepaper" children={<InfoView />} />
                      </Switch>
                    </AppLayout>
                  </DiagramProvider>
                </MarketProvider>
              </MallocProvider>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
