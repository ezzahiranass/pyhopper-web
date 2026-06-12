"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useProjects } from "@/components/providers/ProjectsProvider";

type DefinitionsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DefinitionsPanel({ isOpen, onClose }: DefinitionsPanelProps) {
  const router = useRouter();
  const {
    projects,
    activeProjectId,
    canEditProject,
    switchProject,
    renameProject,
    deleteProject,
    createProject,
    setProjectVisibility,
  } = useProjects();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  const query = search.trim().toLowerCase();
  const filtered = query ? sorted.filter((project) => project.name.toLowerCase().includes(query)) : sorted;

  const handleSelect = (id: string) => {
    switchProject(id);
    router.push(`/definitions/${id}`);
    onClose();
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed) renameProject(id, trimmed);
    setEditingId(null);
  };

  const handleDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    deleteProject(id);
    if (editingId === id) setEditingId(null);
  };

  const handleCreate = () => {
    const nextProjectId = createProject();
    if (nextProjectId) {
      router.push(`/definitions/${nextProjectId}`);
    }
    onClose();
  };

  const handleStartRename = (event: React.MouseEvent, id: string, currentName: string) => {
    event.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  return (
    <div className="definitions-panel">
      <div className="definitions-shell" onClick={(event) => event.stopPropagation()}>
        <div className="definitions-header">
          <div className="definitions-header__title">Definitions</div>
          <div className="definitions-header__meta">{projects.length} saved · synced to Firestore</div>
          <div className="definitions-header__spacer" />
          <input
            ref={searchRef}
            autoFocus
            className="definitions-header__search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="search..."
            type="text"
            value={search}
          />
          <button className="definitions-header__new" onClick={handleCreate} type="button">
            + New
          </button>
          <button aria-label="Close definitions" className="definitions-header__close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="definitions-grid">
          {filtered.length === 0 && (
            <div className="definitions-empty">
              {projects.length === 0 ? "No definitions yet." : "No results found."}
            </div>
          )}
          {filtered.map((project) => (
            <div
              className={`definitions-card${project.id === activeProjectId ? " definitions-card--active" : ""}`}
              key={project.id}
              onClick={() => handleSelect(project.id)}
            >
              <div className="definitions-card__thumb">
                <svg className="definitions-card__icon" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 38 L18 18 L28 26 L42 16 L46 40" />
                  <path d="M14 44 Q24 20, 42 32" />
                  <path d="M14 18 L14 44 L42 44 L42 22" />
                </svg>
                {project.id === activeProjectId ? <div className="definitions-card__badge">active</div> : null}
                {canEditProject(project.id) ? <div className="definitions-card__actions">
                  <button
                    className="definitions-card__btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setProjectVisibility(project.id, !project.isPublic);
                    }}
                    title={project.isPublic ? "Make private" : "Make public"}
                    type="button"
                  >
                    {project.isPublic ? "private" : "public"}
                  </button>
                  <button
                    className="definitions-card__btn"
                    onClick={(event) => handleStartRename(event, project.id, project.name)}
                    title="Rename"
                    type="button"
                  >
                    rename
                  </button>
                  <button
                    className="definitions-card__btn definitions-card__btn--danger"
                    onClick={(event) => handleDelete(event, project.id)}
                    title="Delete"
                    type="button"
                  >
                    del
                  </button>
                </div> : null}
              </div>

              <div className="definitions-card__body">
                {editingId === project.id ? (
                  <input
                    autoFocus
                    className="definitions-card__rename"
                    onBlur={() => handleRenameSubmit(project.id)}
                    onChange={(event) => setEditName(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleRenameSubmit(project.id);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    value={editName}
                  />
                ) : (
                  <span className="definitions-card__name">{project.name}</span>
                )}
                <div className="definitions-card__meta">
                  <span>{Math.max(project.name.length % 21, 3)}n</span>
                  <span>·</span>
                  <span>{Math.max(project.name.length * 2, 9)}L</span>
                  <span className="definitions-card__meta-spacer" />
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  {project.isPublic ? <span>public</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
