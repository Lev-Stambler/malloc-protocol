import { useMalloc } from "../../contexts/malloc"
import React, { useState } from 'react';
import createEngine, { DiagramEngine, DiagramModel, DefaultLinkModel, DefaultNodeModel } from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';

export function CallGraphView() {
  const malloc = useMalloc();
  const engine = createEngine();
  const model = new DiagramModel();
  // node 1
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

  engine.setModel(model);
 
  return <CanvasWidget className="diagram-container" engine={engine} />
}
