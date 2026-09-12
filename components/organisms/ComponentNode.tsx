"use client";

import { type NodeProps } from "@xyflow/react";

import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { renderSpecialNode } from "@/components/organisms/special-nodes/registry";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { formatPortLiteral, isLiteralCapableInput, literalTypeOf } from "@/lib/graph/portLiterals";
import { componentDisplayName, componentNickname, nodeTooltip, portTooltip, type ComponentNodeData, type PyhopperComponentPort } from "@/lib/graph/types";

const PORT_OP_INITIAL: Record<string, string> = {
  Graft: "G",
  Simplify: "S",
  Flatten: "F",
  Reverse: "R",
  Reparametrize: "P",
};

export function ComponentNode({ data, id, selected }: NodeProps) {
  const typedData = data as ComponentNodeData;
  const { definition } = typedData;
  const { edges, nodeTitleMode, nodes, setEdges, setNodes } = useGraphEditor();
  const title = nodeTitleMode === "nickname" ? componentNickname(definition) ?? componentDisplayName(definition) : componentDisplayName(definition);
  const inputLabel = (name: string, index: number) =>
    definition.variadic_inputs && index === definition.inputs.length - 1 ? `${name}...` : name;
  const inputLiteral = (input: PyhopperComponentPort) => {
    const type = literalTypeOf(input);
    if (!type || !(input.name in typedData.values) || !isLiteralCapableInput(definition, input)) return undefined;
    return formatPortLiteral(type, typedData.values[input.name]);
  };
  const isWired = (inputName: string) => edges.some((edge) => edge.target === id && edge.targetHandle === inputName);

  const handlePortContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    portName: string,
    portKind: "input" | "output",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("pyhopper-port-contextmenu", {
        detail: {
          nodeId: id,
          portName,
          portKind,
          clientX: event.clientX,
          clientY: event.clientY,
        },
      }),
    );
  };

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

  const specialNode = renderSpecialNode(definition, {
    data: typedData,
    id,
    onContextMenu: handleContextMenu,
    title: nodeTooltip(definition),
  });
  if (specialNode) {
    return specialNode;
  }

  return (
    <article
      className={`component-node${typedData.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={handleContextMenu}
      title={nodeTooltip(definition)}
    >
      <div className="component-node__body component-node__body--row">
        <div className="component-node__ports component-node__ports--left">
          {definition.inputs.map((input, index) => (
            <GraphPortRow
              access={input.access}
              badge={typedData.portOperations[`input:${input.name}`] ? PORT_OP_INITIAL[typedData.portOperations[`input:${input.name}`]] : undefined}
              handleClassName="component-node__handle component-node__handle--target"
              handleId={input.name}
              key={`input-${input.name}`}
              kind="input"
              label={inputLabel(input.name, index)}
              literal={inputLiteral(input)}
              literalMuted={isWired(input.name)}
              onContextMenu={(event) => handlePortContextMenu(event, input.name, "input")}
              title={portTooltip(input)}
            />
          ))}
        </div>

        <div className="component-node__center">
          <div className="component-node__title-wrap">
            <h3 className="component-node__title">{title}</h3>
          </div>
        </div>

        <div className="component-node__ports component-node__ports--right">
          {definition.outputs.map((output) => (
            <GraphPortRow
              access={output.access}
              badge={typedData.portOperations[`output:${output.name}`] ? PORT_OP_INITIAL[typedData.portOperations[`output:${output.name}`]] : undefined}
              handleClassName="component-node__handle component-node__handle--source"
              handleId={output.name}
              key={`output-${output.name}`}
              kind="output"
              label={output.name}
              onContextMenu={(event) => handlePortContextMenu(event, output.name, "output")}
              title={portTooltip(output)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
