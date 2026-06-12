# Firestore schema

Pyhopper uses two top-level collections: `users` and `definitions`.

```text
users/{uid}
  id
  updatedAt

definitions/{definitionId}
  id
  name
  createdBy: reference to users/{uid}
  isPublic
  createdAt
  updatedAt
  schemaVersion

definitions/{definitionId}/artifacts/graph
  kind: "graph"
  graphId
  graphSchemaVersion
  flow: { nodes, edges, viewport }
  selection

definitions/{definitionId}/artifacts/scene
  kind: "scene"
  scene:
    schemaVersion: 3
    objects:
      {objectId}: { id, name, metadata, transform, atom }

definitions/{definitionId}/artifacts/source
  kind: "source-code"
  language: "python"
  files: [{ path, content }]

definitions/{definitionId}/artifacts/render
  kind: "render"
  modelUrl
  renderManifest
```

Definitions are private by default. An authenticated user can read definitions they own and definitions
where `isPublic` is `true`. Only the user identified by `createdBy` can update metadata or artifacts.

The source artifact uses a files array even though definitions currently generate one Python file. New
artifact kinds can be added without changing the definition metadata document.

The client automatically copies legacy documents from `users/{uid}/definitions` into the new schema.
Legacy documents are left intact so migration is non-destructive.

Each scene object persists exactly one canonical serialized Pyhopper Atom. DataTrees are created only
when an object reference enters graph evaluation. GLBs, sampled curves, and Three.js buffers remain
derived render artifacts.
