"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  createDefinitionDraft,
  deleteDefinition,
  renameDefinition,
  saveDefinition,
  saveDefinitionExport,
  saveDefinitionSelection,
  saveDefinitionSnapshot,
  setDefinitionVisibility,
  subscribeToDefinitions,
  type DefinitionDocument,
  type DefinitionSummary,
} from "@/lib/firestore/definitions";
import {
  type ProjectIndexEntry,
  getActiveProjectId,
  searchProjects,
  setActiveProjectId as persistActiveProjectId,
} from "@/lib/graph/projectStorage";

type ProjectsContextValue = {
  projectDocuments: Record<string, DefinitionDocument>;
  projects: DefinitionSummary[];
  activeProjectId: string | null;
  isHydrated: boolean;
  canEditProject: (id: string) => boolean;
  createProject: (name?: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setProjectVisibility: (id: string, isPublic: boolean) => void;
  switchProject: (id: string) => void;
  searchProjects: (query: string) => ProjectIndexEntry[];
  registerFlushCallback: (flush: (() => void) | null) => void;
  registerExportingRef: (ref: { current: boolean } | null) => void;
  saveProjectExport: (id: string, graphExport: unknown) => void;
  saveProjectSelection: (id: string, selection: unknown) => void;
  saveProjectSnapshot: (id: string, snapshot: unknown) => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children, initialActiveProjectId }: { children: ReactNode; initialActiveProjectId?: string | null }) {
  const { loading, user } = useAuth();
  const [definitions, setDefinitions] = useState<DefinitionDocument[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const flushRef = useRef<(() => void) | null>(null);
  const exportingRef = useRef<{ current: boolean } | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      startTransition(() => {
        setDefinitions([]);
        setActiveProjectId(null);
        setIsHydrated(true);
      });
      return;
    }
    const savedId = initialActiveProjectId ?? getActiveProjectId();

    const unsubscribe = subscribeToDefinitions(user.uid, (nextDefinitions) => {
      startTransition(() => {
        setDefinitions(nextDefinitions);
        setActiveProjectId((currentActiveProjectId) => {
          if (initialActiveProjectId && nextDefinitions.some((project) => project.id === initialActiveProjectId)) {
            return initialActiveProjectId;
          }

          if (currentActiveProjectId && nextDefinitions.some((project) => project.id === currentActiveProjectId)) {
            return currentActiveProjectId;
          }

          if (savedId && nextDefinitions.some((project) => project.id === savedId)) {
            return savedId;
          }

          return nextDefinitions[0]?.id ?? null;
        });
        setIsHydrated(true);
      });
    });

    return unsubscribe;
  }, [initialActiveProjectId, loading, user]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    persistActiveProjectId(activeProjectId);
  }, [activeProjectId, isHydrated]);

  const registerFlushCallback = useCallback((flush: (() => void) | null) => {
    flushRef.current = flush;
  }, []);

  const registerExportingRef = useCallback((ref: { current: boolean } | null) => {
    exportingRef.current = ref;
  }, []);

  const switchProject = useCallback(
    (id: string) => {
      if (id === activeProjectId || exportingRef.current?.current) {
        return;
      }

      flushRef.current?.();

      setActiveProjectId(id);
    },
    [activeProjectId],
  );

  const canEditProject = useCallback(
    (id: string) => !!user && definitions.some((definition) => definition.id === id && definition.createdBy === user.uid),
    [definitions, user],
  );

  const createProject = useCallback(
    (name?: string) => {
      if (!user) {
        return "";
      }

      if (exportingRef.current?.current) {
        return activeProjectId ?? "";
      }

      flushRef.current?.();

      const definition = createDefinitionDraft(user.uid, name);
      setDefinitions((currentDefinitions) => [definition, ...currentDefinitions]);
      setActiveProjectId(definition.id);
      void saveDefinition(user.uid, definition);
      return definition.id;
    },
    [activeProjectId, user],
  );

  const deleteProject = useCallback(
    (id: string) => {
      if (!user) {
        return;
      }

      if (exportingRef.current?.current || !canEditProject(id)) {
        return;
      }

      setDefinitions((currentDefinitions) => {
        const nextDefinitions = currentDefinitions.filter((project) => project.id !== id);
        if (activeProjectId === id) {
          setActiveProjectId(nextDefinitions[0]?.id ?? null);
        }
        return nextDefinitions;
      });
      void deleteDefinition(user.uid, id);
    },
    [activeProjectId, canEditProject, user],
  );

  const renameProject = useCallback((id: string, name: string) => {
    if (!user || !canEditProject(id)) {
      return;
    }

    setDefinitions((currentDefinitions) =>
      currentDefinitions.map((project) =>
        project.id === id ? { ...project, name, updatedAt: Date.now() } : project,
      ),
    );
    void renameDefinition(user.uid, id, name);
  }, [canEditProject, user]);

  const setProjectVisibility = useCallback((id: string, isPublic: boolean) => {
    if (!user || !canEditProject(id)) {
      return;
    }

    setDefinitions((currentDefinitions) =>
      currentDefinitions.map((project) =>
        project.id === id ? { ...project, isPublic, updatedAt: Date.now() } : project,
      ),
    );
    void setDefinitionVisibility(user.uid, id, isPublic);
  }, [canEditProject, user]);

  const saveProjectSnapshot = useCallback((id: string, snapshot: unknown) => {
    if (!user || !canEditProject(id)) {
      return;
    }

    setDefinitions((currentDefinitions) =>
      currentDefinitions.map((project) =>
        project.id === id ? { ...project, snapshot, updatedAt: Date.now() } : project,
      ),
    );
    void saveDefinitionSnapshot(user.uid, id, snapshot);
  }, [canEditProject, user]);

  const saveProjectExport = useCallback((id: string, graphExport: unknown) => {
    if (!user || !canEditProject(id)) {
      return;
    }

    setDefinitions((currentDefinitions) =>
      currentDefinitions.map((project) =>
        project.id === id ? { ...project, graphExport, updatedAt: Date.now() } : project,
      ),
    );
    void saveDefinitionExport(user.uid, id, graphExport);
  }, [canEditProject, user]);

  const saveProjectSelection = useCallback((id: string, selection: unknown) => {
    if (!user || !canEditProject(id)) {
      return;
    }

    setDefinitions((currentDefinitions) =>
      currentDefinitions.map((project) =>
        project.id === id ? { ...project, selection } : project,
      ),
    );
    void saveDefinitionSelection(user.uid, id, selection);
  }, [canEditProject, user]);

  const projects = definitions.map(({ createdAt, createdBy, id, isPublic, name, updatedAt }) => ({
    createdAt,
    createdBy,
    id,
    isPublic,
    name,
    updatedAt,
  }));

  const projectDocuments = definitions.reduce<Record<string, DefinitionDocument>>((result, definition) => {
    result[definition.id] = definition;
    return result;
  }, {});

  const search = useCallback(
    (query: string) => searchProjects(projects, query),
    [projects],
  );

  const value: ProjectsContextValue = {
    projectDocuments,
    projects,
    activeProjectId,
    isHydrated,
    canEditProject,
    createProject,
    deleteProject,
    renameProject,
    setProjectVisibility,
    switchProject,
    searchProjects: search,
    registerFlushCallback,
    registerExportingRef,
    saveProjectExport,
    saveProjectSelection,
    saveProjectSnapshot,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}

export function ProjectGate({ children }: { children: (activeProjectId: string) => ReactNode }) {
  const { activeProjectId, isHydrated, createProject } = useProjects();

  useEffect(() => {
    if (isHydrated && !activeProjectId) {
      createProject();
    }
  }, [activeProjectId, createProject, isHydrated]);

  if (!isHydrated || !activeProjectId) {
    return null;
  }

  return <>{children(activeProjectId)}</>;
}
