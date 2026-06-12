export type SerializedAtom = {
  type: string;
  [key: string]: unknown;
};

export type SceneObjectMetadata = {
  createdByCommand: string;
  locked: boolean;
  tags: string[];
  visible: boolean;
};

export type SceneObjectTransform = {
  matrix: number[];
  pivot: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export type SceneObject = {
  id: string;
  metadata: SceneObjectMetadata;
  name: string;
  revision: number;
  transform: SceneObjectTransform;
  atom: SerializedAtom;
};

export type SceneDocument = {
  schemaVersion: 3;
  objects: Record<string, SceneObject>;
};
