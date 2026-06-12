export type ProjectIndexEntry = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

const PROJECTS_INDEX_KEY = "pyhopper.projects.index.v1";
const ACTIVE_PROJECT_KEY = "pyhopper.projects.active.v1";
const OLD_SNAPSHOT_KEY = "pyhopper.graph.snapshot.v1";
const OLD_EXPORT_KEY = "pyhopper.graph.export.v1";
const OLD_SELECTION_KEY = "pyhopper.graph.selection.v1";

export function snapshotKey(projectId: string): string {
  return `pyhopper.project.snapshot.v1.${projectId}`;
}

export function exportKey(projectId: string): string {
  return `pyhopper.project.export.v1.${projectId}`;
}

export function selectionKey(projectId: string): string {
  return `pyhopper.project.selection.v1.${projectId}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded
  }
}

let counter = 0;

function makeId(): string {
  return `${Date.now()}-${++counter}`;
}

export function loadProjectIndex(): ProjectIndexEntry[] {
  return read<ProjectIndexEntry[]>(PROJECTS_INDEX_KEY, []);
}

export function saveProjectIndex(projects: ProjectIndexEntry[]): void {
  write(PROJECTS_INDEX_KEY, projects);
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function createProjectEntry(name?: string, id: string = makeId()): ProjectIndexEntry {
  const now = Date.now();
  return {
    id,
    name: name ?? "Untitled",
    createdAt: now,
    updatedAt: now,
  };
}

export function deleteProjectEntry(projects: ProjectIndexEntry[], id: string): ProjectIndexEntry[] {
  return projects.filter((project) => project.id !== id);
}

export function renameProjectEntry(projects: ProjectIndexEntry[], id: string, name: string): ProjectIndexEntry[] {
  return projects.map((project) =>
    project.id === id ? { ...project, name, updatedAt: Date.now() } : project,
  );
}

export function touchProjectEntry(projects: ProjectIndexEntry[], id: string): ProjectIndexEntry[] {
  return projects.map((project) =>
    project.id === id ? { ...project, updatedAt: Date.now() } : project,
  );
}

export function searchProjects(projects: ProjectIndexEntry[], query: string): ProjectIndexEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return projects;
  }
  return projects.filter((project) => project.name.toLowerCase().includes(normalizedQuery));
}

export function deleteProjectStorage(projectId: string): void {
  localStorage.removeItem(snapshotKey(projectId));
  localStorage.removeItem(exportKey(projectId));
  localStorage.removeItem(selectionKey(projectId));
}

export function migrateFromSingleProject(): ProjectIndexEntry | null {
  const oldSnapshot = localStorage.getItem(OLD_SNAPSHOT_KEY);
  if (!oldSnapshot) {
    return null;
  }

  try {
    const parsed = JSON.parse(oldSnapshot);
    const graphId: string = parsed?.graphId;
    if (!graphId) {
      return null;
    }

    const now = Date.now();
    const entry: ProjectIndexEntry = {
      id: graphId,
      name: "My First Project",
      createdAt: now,
      updatedAt: now,
    };

    localStorage.setItem(snapshotKey(graphId), oldSnapshot);

    const oldExport = localStorage.getItem(OLD_EXPORT_KEY);
    if (oldExport) {
      localStorage.setItem(exportKey(graphId), oldExport);
    }

    const oldSelection = localStorage.getItem(OLD_SELECTION_KEY);
    if (oldSelection) {
      localStorage.setItem(selectionKey(graphId), oldSelection);
    }

    localStorage.removeItem(OLD_SNAPSHOT_KEY);
    localStorage.removeItem(OLD_EXPORT_KEY);
    localStorage.removeItem(OLD_SELECTION_KEY);

    return entry;
  } catch {
    return null;
  }
}

export const PROJECTS_INDEX_STORAGE_KEY = PROJECTS_INDEX_KEY;
export const ACTIVE_PROJECT_STORAGE_KEY = ACTIVE_PROJECT_KEY;