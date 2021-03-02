import React, { useState } from "react";
import { Layout, Menu } from "antd";
import { Link } from "react-router-dom";
import {
  DesktopOutlined,
  BarsOutlined,
  PlusOutlined,
  DollarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { AppBar } from "../AppBar";
import { useMalloc } from "../../contexts/malloc";

const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

export const AppLayout = (props: any) => {
  const [collapsed, setCollapsed] = useState(false);
  const malloc = useMalloc();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={() => setCollapsed(!collapsed)}
      >
        <div className="logo" />
        <Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline">
          <Menu.Item key="1" icon={<DesktopOutlined />}>
            <Link to="/">Dashboard</Link>
          </Menu.Item>
          <Menu.Item key="2" icon={<DollarOutlined />}>
            <Link to="/faucet">Faucet</Link>
          </Menu.Item>
          <Menu.Item key="6" icon={<PlusOutlined />}>
            <Link to="/graph/:new">Create Basket</Link>
          </Menu.Item>
          <SubMenu key="baskets" icon={<BarsOutlined />} title="My Baskets">
            {malloc.getBasketNames().map((name, i) => (
              <Menu.Item key={`basket-${i}`}>Buy some eth</Menu.Item>
            ))}
          </SubMenu>
          <Menu.Item key="2" icon={<InfoCircleOutlined />}>
            <Link to="/ultralitepaper">Ultralitepaper</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ padding: "0 0 0 16px" }}>
          <div className="w-full h-full">
            <AppBar />
          </div>
        </Header>
        <Content style={{ margin: "0 16px" }}>
          <div className="w-full h-full">{props.children}</div>
        </Content>
        <Footer style={{ textAlign: "center" }}>
          Note: This is a *very* experimental demo - expect things to explode
          intermittently
        </Footer>
      </Layout>
    </Layout>
  );
};
