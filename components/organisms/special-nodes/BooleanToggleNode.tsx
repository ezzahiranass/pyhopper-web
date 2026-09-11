"use client";

import { Switch } from "@/components/atoms/Switch";
import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { portTooltip, type ComponentNodeData } from "@/lib/graph/types";

type BooleanToggleNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

export function BooleanToggleNode({ data, id, onContextMenu, title }: BooleanToggleNodeProps) {
  const { requestRealtimeGeneration, setNodeValue } = useGraphEditor();
  const value = data.values.value === true;
  const output = data.definition.outputs[0];

  return (
    <article
      className={`component-node component-node--boolean-toggle${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--preset">
        <div className="component-node__special-control">
          <span className="component-node__special-title">Boolean Toggle</span>
          <Switch
            aria-label="Boolean Toggle"
            className="nodrag"
            checked={value}
            onCheckedChange={(checked) => {
              setNodeValue(id, "value", checked);
              requestRealtimeGeneration();
            }}
          />
          <strong>{value ? "True" : "False"}</strong>
        </div>
        <div className="component-node__ports component-node__ports--right">
          <GraphPortRow
            handleClassName="component-node__handle component-node__handle--source"
            handleId={output.name}
            kind="output"
            title={portTooltip(output)}
          />
        </div>
      </div>
    </article>
  );
}
