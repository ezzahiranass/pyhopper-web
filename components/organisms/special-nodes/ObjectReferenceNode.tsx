"use client";

import { useMemo, useState } from "react";

import { GraphPortRow } from "@/components/molecules/GraphPortRow";
import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import type { ComponentNodeData } from "@/lib/graph/types";

type ObjectReferenceNodeProps = {
  data: ComponentNodeData;
  id: string;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  title?: string;
};

export function ObjectReferenceNode({ data, id, onContextMenu, title }: ObjectReferenceNodeProps) {
  const { requestRealtimeGeneration, scene, setNodeValue } = useGraphEditor();
  const selectedObjectId = typeof data.values.objectId === "string" ? data.values.objectId : "";
  const selectedObject = scene.objects[selectedObjectId];
  const [query, setQuery] = useState(selectedObject?.name ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return Object.values(scene.objects)
      .filter(
        (object) =>
          !normalized ||
          object.name.toLowerCase().includes(normalized) ||
          object.id.toLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [query, scene.objects]);
  const handlePortContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("pyhopper-port-contextmenu", {
        detail: {
          nodeId: id,
          portName: "geometry",
          portKind: "output",
          clientX: event.clientX,
          clientY: event.clientY,
        },
      }),
    );
  };

  return (
    <article
      className={`component-node component-node--object-reference${data.previewEnabled ? "" : " component-node--preview-off"}`}
      onContextMenu={onContextMenu}
      title={title}
    >
      <div className="component-node__body component-node__body--preset">
        <div className="component-node__center component-node__center--slider">
          <div className="component-node__title-wrap">
            <h3 className="component-node__title component-node__title--horizontal">Object Reference</h3>
          </div>
          <div className="component-node__object-reference-picker">
            <input
              aria-label="Search scene objects"
              className="component-node__object-reference-input nodrag nowheel"
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => window.setTimeout(() => setIsSearching(false), 100)}
              onFocus={() => setIsSearching(true)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Choose scene object"
              value={query}
            />
            {isSearching && suggestions.length ? (
              <div className="component-node__object-reference-suggestions nodrag">
                {suggestions.map((object) => (
                  <button
                    className="component-node__object-reference-option"
                    key={object.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(object.name);
                      setIsSearching(false);
                      setNodeValue(id, "objectId", object.id);
                      requestRealtimeGeneration();
                    }}
                    type="button"
                  >
                    <span>{object.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="component-node__ports component-node__ports--right">
          <GraphPortRow
            badge={data.portOperations["output:geometry"]?.slice(0, 1)}
            handleClassName="component-node__handle component-node__handle--source"
            handleId="geometry"
            kind="output"
            label="geometry"
            onContextMenu={handlePortContextMenu}
          />
        </div>
      </div>
    </article>
  );
}
