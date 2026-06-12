"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Matrix4, type Vector3Tuple } from "three";

import { useGraphEditor } from "@/components/providers/GraphEditorProvider";
import { updateSceneObjectTransform } from "@/lib/scene/transforms";
import { transformObjectPoints } from "@/lib/scene/editing";
import { getViewportCommand } from "@/lib/viewport/commands/registry";
import type {
  ViewportCommandId,
  ViewportCommandResult,
  ViewportCommandState,
} from "@/lib/viewport/commands/types";
import { isEditableKeyboardTarget } from "@/lib/viewport/commands/utils/keyboard";
import { createEmptyViewportCommandState } from "@/lib/viewport/commands/utils/scene";

type ViewportToolContextValue = {
  activeTool: ViewportCommandId;
  setActiveTool: (id: ViewportCommandId) => void;
  commandState: ViewportCommandState;
  setHoverPoint: (point: Vector3Tuple | null) => void;
  placePoint: (point: Vector3Tuple) => void;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectObject: (id: string | null) => void;
  selectObjects: (ids: string[]) => void;
  mode: ViewportMode;
  setMode: (mode: ViewportMode) => void;
  selectedPointKeys: string[];
  selectPoints: (keys: string[]) => void;
  transformMode: TransformMode;
  commitObjectTransform: (
    objectId: string,
    position: Vector3Tuple,
    rotation: Vector3Tuple,
    scale: Vector3Tuple,
  ) => void;
  createReference: (objectId: string) => void;
  commitPointTransform: (objectId: string, pointKeys: string[], worldDelta: Matrix4) => void;
  transformActiveRef: MutableRefObject<boolean>;
};

export type TransformMode = "translate" | "rotate" | "scale" | null;
export type ViewportMode = "object" | "edit";

const ViewportToolContext = createContext<ViewportToolContextValue | null>(null);

export function ViewportToolProvider({ children }: { children: ReactNode }) {
  const { addObjectReferenceNode, deleteSceneObjects, scene, setScene } = useGraphEditor();
  const [activeTool, setActiveTool] = useState<ViewportCommandId>("select");
  const [commandState, setCommandState] = useState<ViewportCommandState>(createEmptyViewportCommandState);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [mode, setModeState] = useState<ViewportMode>("object");
  const [selectedPointKeys, setSelectedPointKeys] = useState<string[]>([]);
  const [transformMode, setTransformMode] = useState<TransformMode>(null);
  const transformActiveRef = useRef(false);
  const viewportActiveRef = useRef(false);
  const selectedObjectId = selectedObjectIds.length === 1 ? selectedObjectIds[0] : null;

  const applyResult = useCallback(
    (result: ViewportCommandResult) => {
      setCommandState(result.commandState);
      setScene(result.scene);
    },
    [setScene],
  );

  const changeActiveTool = useCallback(
    (id: ViewportCommandId) => {
      if (activeTool === id) return;
      const cancel = getViewportCommand(activeTool).onCancel;
      if (cancel) applyResult(cancel(commandState, scene));
      setActiveTool(id);
      setTransformMode(null);
    },
    [activeTool, applyResult, commandState, scene],
  );

  const placePoint = useCallback(
    (point: Vector3Tuple) => {
      const onPoint = getViewportCommand(activeTool).onPoint;
      if (onPoint) {
        const result = onPoint(commandState, scene, point);
        applyResult(result);
        if (result.completed) setActiveTool("select");
      }
    },
    [activeTool, applyResult, commandState, scene],
  );

  const setHoverPoint = useCallback((point: Vector3Tuple | null) => {
    setCommandState((current) => ({ ...current, hoverPoint: point }));
  }, []);

  const selectObject = useCallback((id: string | null) => {
    if (id && selectedObjectIds.length === 1 && selectedObjectIds[0] === id && mode === "object") {
      setModeState("edit");
      setSelectedPointKeys([]);
      setTransformMode("translate");
      return;
    }
    setSelectedObjectIds(id ? [id] : []);
    setSelectedPointKeys([]);
    setModeState("object");
    setTransformMode(id ? "translate" : null);
  }, [mode, selectedObjectIds]);

  const selectObjects = useCallback((ids: string[]) => {
    setSelectedObjectIds(ids);
    setSelectedPointKeys([]);
    setModeState("object");
    setTransformMode(ids.length === 1 ? "translate" : null);
  }, []);

  const setMode = useCallback((nextMode: ViewportMode) => {
    setModeState(nextMode === "edit" && selectedObjectIds.length === 1 ? "edit" : "object");
    setSelectedPointKeys([]);
    setTransformMode(selectedObjectIds.length === 1 ? "translate" : null);
  }, [selectedObjectIds]);

  const commitObjectTransform = useCallback(
    (objectId: string, position: Vector3Tuple, rotation: Vector3Tuple, scale: Vector3Tuple) => {
      setScene((currentScene) => {
        const object = currentScene.objects[objectId];
        if (!object || object.metadata.locked) return currentScene;
        return {
          ...currentScene,
          objects: {
            ...currentScene.objects,
            [objectId]: {
              ...object,
              revision: object.revision + 1,
              transform: updateSceneObjectTransform(object.transform, position, rotation, scale),
            },
          },
        };
      });
    },
    [setScene],
  );

  const commitPointTransform = useCallback((objectId: string, pointKeys: string[], worldDelta: Matrix4) => {
    setScene((currentScene) => {
      const object = currentScene.objects[objectId];
      if (!object || object.metadata.locked) return currentScene;
      return {
        ...currentScene,
        objects: {
          ...currentScene.objects,
          [objectId]: transformObjectPoints(object, pointKeys, worldDelta),
        },
      };
    });
  }, [setScene]);

  useEffect(() => {
    transformActiveRef.current = false;
  }, [mode]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      viewportActiveRef.current =
        event.target instanceof Element && Boolean(event.target.closest(".scene-shell"));
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableKeyboardTarget(event.target)) return;

      const command = getViewportCommand(activeTool);
      if (event.key === "Escape") {
        event.preventDefault();
        if (command.onCancel) applyResult(command.onCancel(commandState, scene));
        setActiveTool("select");
        if (mode === "edit") {
          setSelectedPointKeys([]);
          setModeState("object");
          setTransformMode(selectedObjectId ? "translate" : null);
          return;
        }
        setSelectedObjectIds([]);
        setSelectedPointKeys([]);
        setModeState("object");
        setTransformMode(null);
        return;
      }

      if (
        viewportActiveRef.current &&
        !transformActiveRef.current &&
        selectedObjectIds.length &&
        (event.key === "Delete" || event.key === "Backspace")
      ) {
        event.preventDefault();
        deleteSceneObjects(selectedObjectIds);
        setSelectedObjectIds([]);
        setSelectedPointKeys([]);
        setModeState("object");
        setTransformMode(null);
        return;
      }

      if (activeTool === "select" && selectedObjectId) {
        const nextMode =
          event.key.toLowerCase() === "t"
            ? "translate"
            : event.key.toLowerCase() === "r"
              ? "rotate"
              : event.key.toLowerCase() === "e"
                ? "scale"
                : null;
        if (nextMode) {
          event.preventDefault();
          setTransformMode(nextMode);
          return;
        }
      }

      const handler = event.key === "Enter" ? command.onComplete : undefined;
      if (!handler) return;
      event.preventDefault();
      applyResult(handler(commandState, scene));
      setActiveTool("select");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, applyResult, commandState, deleteSceneObjects, mode, scene, selectedObjectId, selectedObjectIds]);

  const value = useMemo(
    () => ({
      activeTool,
      commitPointTransform,
      commitObjectTransform,
      commandState,
      createReference: addObjectReferenceNode,
      mode,
      placePoint,
      selectedObjectIds,
      selectedObjectId,
      selectedPointKeys,
      selectObject,
      selectObjects,
      selectPoints: setSelectedPointKeys,
      setMode,
      setHoverPoint,
      setActiveTool: changeActiveTool,
      transformMode,
      transformActiveRef,
    }),
    [
      activeTool,
      addObjectReferenceNode,
      changeActiveTool,
      commandState,
      commitPointTransform,
      commitObjectTransform,
      mode,
      placePoint,
      selectObject,
      selectedObjectId,
      selectedObjectIds,
      selectedPointKeys,
      selectObjects,
      setHoverPoint,
      setMode,
      transformMode,
      transformActiveRef,
    ],
  );

  return <ViewportToolContext.Provider value={value}>{children}</ViewportToolContext.Provider>;
}

export function useViewportTool() {
  const ctx = useContext(ViewportToolContext);
  if (!ctx) throw new Error("useViewportTool must be used inside ViewportToolProvider");
  return ctx;
}
