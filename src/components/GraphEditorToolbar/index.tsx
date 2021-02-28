import React, { useState } from "react";
import { useMalloc } from '../../contexts/malloc';
import { DiagramModel, DefaultLinkModel, DefaultNodeModel, DiagramEngine } from "@projectstorm/react-diagrams";
import { Button, Popover } from "antd";
import { PieChartOutlined, FunctionOutlined, PlusOutlined, DeleteOutlined, SyncOutlined } from "@ant-design/icons";
import { magenta, grey } from "@ant-design/colors"
import { FindCallModal } from "../../components/FindCallModal";
import { FindBasketModal } from "../../components/FindBasketModal";
import { BasketNode, isWCallChained, WCallChainedNode, WCallSimpleNode } from "../../models/malloc";

export interface GraphEditorToolbarProps {
  model: DiagramModel,
}

export function GraphEditorToolbar(props: GraphEditorToolbarProps) {
  const [callModalVisible, setCallModalVisible] = useState(false)
  const [basketModalVisible, setBasketModalVisible] = useState(false)
  const [root, setRoot] = useState<BasketNode | null>(null);
  const [nodes, setNodes] = useState({});

  const malloc = useMalloc();
  
  function createBasketNode(basket: BasketNode) {
    const node = new DefaultNodeModel({
      name: basket.name,
      color: magenta.primary,
    });
    node.setPosition(100, 100);
    const input = node.addInPort(basket.input);
    model.addNode(node);
   
    basket.graphElementId = node.getID();
    
    basket.calls
      .map((call, i) => [call as any, basket.splits[i] as any])
      .forEach(([call, split], i) => {
        const callNode = createCallNode(call.name);
        const basketOutput = node.addOutPort(`${split / 500}: ${call.name}`);
        const callInput = callNode.addInPort(call.input);
        const link = basketOutput.link<DefaultLinkModel>(callInput);
        model.addLink(link);


        if (call.hasOwnProperty("callbackBasket")) {
          const callbackBasket = (call as WCallChainedNode).callbackBasket
          const callbackNode = createBasketNode(callbackBasket);
          const callOutput = callNode.addOutPort(callbackBasket.name);
          const callbackInput = callbackNode.addInPort(call.name);
          const link = callOutput.link<DefaultLinkModel>(callbackInput);
          model.addLink(link);
        }
      });

    return node
  }

  const createCallNode = (call: WCallSimpleNode | WCallChainedNode) => {
    const node = new DefaultNodeModel({
      name: call.name,
      color: grey[1],
    });
    node.setPosition(100, 200);
    model.addNode(node);
    call.graphElementId = node.getID();
    return node
  }

  const addCallOk = (callName: string) => {
    setCallModalVisible(false);
    const node  = malloc.getCallNode(callName);
    if (node) {
      createCallNode(node);
    } else {
      alert('invalid callName');
    }
  }

  const addBasketOk = (node: BasketNode) => {
    setBasketModalVisible(false);
    createBasketNode(node);
  }
  
  const { model } = props; 


  const buttons = (
    <div className="flex flex-col flex-shrink">
      <Button className="mt-2" type="default" size="large" onClick={() => setBasketModalVisible(true)} icon={<PieChartOutlined/>}> 
        Basket
      </Button>
      <Button className="mt-2" type="default" size="large" onClick={() => setCallModalVisible(true)} icon={<FunctionOutlined/>}>
        Call
      </Button>
    </div>
  )
  
  return (
    <>
      <FindBasketModal isVisible={basketModalVisible} onCancel={() => setBasketModalVisible(false)} onOk={addBasketOk}/>
      <FindCallModal isVisible={callModalVisible} onCancel={() => setCallModalVisible(false)} onOk={addCallOk}/>
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
    </>
  )
}
