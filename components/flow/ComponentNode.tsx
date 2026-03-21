"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { useGraphEditor } from "@/components/flow/GraphEditorContext";
import { NumberSliderNode } from "@/components/flow/SpecialNodes/NumberSliderNode";
import { PanelNode } from "@/components/flow/SpecialNodes/PanelNode";
import type { ComponentNodeData } from "@/components/flow/types";

export function ComponentNode({ data, id, selected }: NodeProps) {
  const typedData = data as ComponentNodeData;
  const { definition } = typedData;
  const { nodes, setEdges, setNodes } = useGraphEditor();
  const inputLabel = (name: string, index: number) =>
    definition.variadic_inputs && index === definition.inputs.length - 1 ? `${name}...` : name;

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedNodeIds = nodes.filter((entry) => entry.selected).map((entry) => entry.id);
    const targetNodeIds = selected && selectedNodeIds.length > 1 ? selectedNodeIds : [id];

    setNodes((current) =>
      current.map((entry) => ({
        ...entry,
        selected: targetNodeIds.includes(entry.id),
      })),
    );
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
    window.dispatchEvent(
      new CustomEvent("pyhopper-node-contextmenu", {
        detail: {
          nodeIds: targetNodeIds,
          clientX: event.clientX,
          clientY: event.clientY,
        },
      }),
    );
  };

  if (definition.frontend_preset === "number-slider") {
    return <NumberSliderNode data={typedData} id={id} onContextMenu={handleContextMenu} />;
  }

  if (definition.frontend_preset === "panel") {
    return <PanelNode data={typedData} id={id} onContextMenu={handleContextMenu} />;
  }

  return (
    <article
      className={`component-node${typedData.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={handleContextMenu}
    >
      <div className="component-node__body component-node__body--row">
        <div className="component-node__ports component-node__ports--left">
          {definition.inputs.map((input, index) => (
            <div className="component-node__port-row component-node__port-row--input" key={`input-${input.name}`}>
              <Handle
                className="component-node__handle component-node__handle--target"
                id={input.name}
                position={Position.Left}
                type="target"
              />
              <p className="component-node__port-name">{inputLabel(input.name, index)}</p>
            </div>
          ))}
        </div>

        <div className="component-node__center">
          <div className="component-node__title-wrap">
            <h3 className="component-node__title">{definition.component}</h3>
          </div>
        </div>

        <div className="component-node__ports component-node__ports--right">
          {definition.outputs.map((output) => (
            <div className="component-node__port-row component-node__port-row--output" key={`output-${output.name}`}>
              <p className="component-node__port-name">{output.name}</p>
              <Handle
                className="component-node__handle component-node__handle--source"
                id={output.name}
                position={Position.Right}
                type="source"
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
