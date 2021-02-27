import React, { useCallback, useContext, useState, useMemo } from "react";
import createEngine, { DiagramModel, DiagramEngine } from "@projectstorm/react-diagrams";

export interface DiagramState {
  engine: DiagramEngine,
  model: DiagramModel,
  clearModel: () => void,
}

function defaultContext() {
  let model = new DiagramModel();
  const engine = createEngine();
  engine.setModel(model)
  return {
    engine: engine,
    model: model,
    clearModel: () => {
      model = new DiagramModel();
    }
  }
}

const DiagramContext = React.createContext<DiagramState>(defaultContext());


export function DiagramProvider({ children = null as any }) {
  const engine = useMemo(() => createEngine(), []);
  const [model, setModel] = useState(new DiagramModel())

  const clearModel = useCallback(() => {
    const newModel = new DiagramModel()
    setModel(newModel);
  }, []);

  return (
    <DiagramContext.Provider value={{engine, model, clearModel}}>
      {children}
    </DiagramContext.Provider>
  );
}

export function useDiagram() {
  const context = useContext(DiagramContext);
  context.engine.setModel(context.model);
  return context;
}
