import React from "react";
import { DiagramModel, DefaultLinkModel, DefaultNodeModel, DiagramEngine } from "@projectstorm/react-diagrams";
import { Button, Popover } from "antd";
import { PieChartOutlined, FunctionOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { magenta, grey } from "@ant-design/colors"

export interface GraphEditorToolbarProps {
  model: DiagramModel,
}

export function GraphEditorToolbar(props: GraphEditorToolbarProps) {
  const { model } = props; 
  const createBasketNode = () => {
    const node = new DefaultNodeModel({
      name: 'Basket',
      color: magenta.primary,
    });
    node.setPosition(100, 100);
    const input = node.addInPort('input');
    const output = node.addOutPort('out');
    model.addNode(node);
  }

  const createCallNode = () => {
    const node = new DefaultNodeModel({
      name: 'call',
      color: grey[1],
    });
    node.setPosition(100, 200);
    model.addNode(node);
  }

  const buttons = (
    <div className="flex flex-col flex-shrink">
      <Button className="mt-2" type="default" size="large" onClick={createBasketNode} icon={<PieChartOutlined/>}> 
        Basket
      </Button>
      <Button className="mt-2" type="default" size="large" onClick={createCallNode} icon={<FunctionOutlined/>}>
        Call
      </Button>
    </div>
  )
  
  return (
    <div className="flex flex-row h-12 max-h-full w-full justify-end">
      <div className="flex-intial h-full px-4">
        <Popover
          placement="topRight"
          title="Create New"
          content={buttons}
          trigger="click"
        >
          <Button type="default" size="large" icon={<PlusOutlined/>}/> 
        </Popover>
      </div>
    </div>
  )
}
