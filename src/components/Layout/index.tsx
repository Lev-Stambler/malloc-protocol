import React, { useState } from "react";
import { Layout, Menu, Row, Col } from 'antd';
import { Link } from "react-router-dom";
import {
  DesktopOutlined,
  PieChartOutlined,
  FunctionOutlined,
  BarsOutlined,
  PlusOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { ConnectButton } from "../ConnectButton";
import { CurrentUserBadge } from "../CurrentUserBadge";

const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

export const AppLayout = (props: any) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)}>
        <div className="logo" />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<DesktopOutlined />}>
            <Link to="/">
            Dashboard
            </Link>
          </Menu.Item>
          <Menu.Item key="2" icon={<DollarOutlined/>}>
            <Link to="/faucet">
              Faucet
            </Link>
          </Menu.Item>
          <SubMenu key="baskets" icon={<BarsOutlined/>} title="My Baskets">
            <Menu.Item key="3">Buy some eth</Menu.Item>
            <Menu.Item key="4">Totally sick loopty-loop</Menu.Item>
            <Menu.Item key="5">top-secret portfolio</Menu.Item>
          </SubMenu>
          <SubMenu key="create" icon={<PlusOutlined />} title="Create">
              <Menu.Item key="6" icon={<PieChartOutlined/>}>Basket</Menu.Item>
              <Menu.Item key="7" icon={<FunctionOutlined/>}>
                <Link to="/register-wcall">
                  Call
                </Link>
              </Menu.Item>
          </SubMenu>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 0 0 16px' }} >
          <Row>
            <Col flex="auto">
              <h2>Malloc Protocol</h2>
            </Col>
            <Col flex="200px">
              <CurrentUserBadge/> 
            </Col>
            <Col flex="100px">
              <ConnectButton/>
            </Col>
          </Row>
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <div>
            {props.children}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Note: This is a *very* experimental demo - expect things to explode intermittently</Footer>
      </Layout>
    </Layout>
  );
};
