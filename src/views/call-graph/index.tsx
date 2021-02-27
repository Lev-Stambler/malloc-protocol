import { useMalloc } from "../../contexts/malloc";
import { useDiagram } from "../../contexts/diagram";
import React, { useEffect } from 'react';
import { DiagramEngine, DiagramModel, DefaultLinkModel, DefaultNodeModel } from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { useParams } from "react-router-dom";

function drawGraph(model: DiagramModel) {
  const node1 = new DefaultNodeModel({
      name: 'Node 1',
      color: 'rgb(0,192,255)',
  });
  node1.setPosition(100, 100);
  let port1 = node1.addOutPort('Out');

  // node 2
  const node2 = new DefaultNodeModel({
      name: 'Node 1',
      color: 'rgb(0,192,255)',
  });
  node2.setPosition(100, 100);
  let port2 = node2.addOutPort('Out');

  const link = port1.link<DefaultLinkModel>(port2);

  model.addAll(node1, node2, link);
}

export function CallGraphView() {
  const { topLevelBasketId } = useParams() as any;
  const { engine, model, clearModel } = useDiagram();

  useEffect(() => {
    clearModel()
  }, [topLevelBasketId, clearModel])
 
  useEffect(() => {
    drawGraph(model)  
  }, [model]);

  const malloc = useMalloc();
  const isNew = topLevelBasketId === "new";
 
  return (
    <div className="flex flex-row h-full justify-around">
      <div className="flex flex-grow flex-col">
        <div className="flex-grow">
          <CanvasWidget className="w-full h-full" engine={engine} />
        </div> 
      </div>
    </div>
  );
}
