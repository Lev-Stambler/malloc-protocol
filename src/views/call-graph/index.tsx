import { useMalloc } from "../../contexts/malloc";
import { useDiagram } from "../../contexts/diagram";
import React, { useCallback, useEffect } from 'react';
import { DiagramModel, DefaultLinkModel, DefaultNodeModel } from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { useParams } from "react-router-dom";
import {GraphEditorToolbar} from "../../components/GraphEditorToolbar";
import { magenta, grey } from "@ant-design/colors"

function drawGraph(model: DiagramModel) {
}

export function CallGraphView() {
  const { topLevelBasketId } = useParams() as any;
  const { engine, model, clearModel } = useDiagram();

  useEffect(() => {
    clearModel()
  }, [topLevelBasketId, clearModel])
 
  useEffect(() => {
    console.log("drawGraph!");
    drawGraph(model)  
  }, [model]);

  const repaintCanvas = useCallback(() => {
    engine.repaintCanvas();
  }, [engine]);

  const malloc = useMalloc();
  const isNew = topLevelBasketId === "new";
 
  return (
    <div className="flex flex-row h-full justify-around">
      <div className="flex flex-grow flex-col">
        <div className="py-2 z-index-2 ">
          <GraphEditorToolbar model={model} repaintCanvas={repaintCanvas}/>
        </div>
        <div className="py-2 flex-grow">
          <CanvasWidget className="w-full h-full" engine={engine} />
        </div> 
      </div>
    </div>
  );
}
