"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useProjects } from "@/components/providers/ProjectsProvider";

export function DefinitionsBrowser() {
  const router = useRouter();
  const {
    projects,
    activeProjectId,
    canEditProject,
    createProject,
    deleteProject,
    renameProject,
    setProjectVisibility,
  } = useProjects();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  const query = search.trim().toLowerCase();
  const filtered = query ? sorted.filter((project) => project.name.toLowerCase().includes(query)) : sorted;

  const handleRenameSubmit = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      renameProject(id, trimmed);
    }
    setEditingId(null);
  };

  const handleCreate = () => {
    const nextProjectId = createProject();
    if (nextProjectId) {
      router.push(`/definitions/${nextProjectId}`);
    }
  };

  return (
    <section className="definitions-browser">
      <div className="definitions-browser__header">
        <div>
          <p className="definitions-browser__eyebrow">Workspace</p>
          <h1 className="definitions-browser__title">Definitions</h1>
          <p className="definitions-browser__description">Browse your definitions and public definitions shared by others.</p>
        </div>

        <div className="definitions-browser__toolbar">
          <input
            ref={searchRef}
            className="definitions-header__search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search definitions"
            type="text"
            value={search}
          />
          <button className="definitions-header__new" onClick={handleCreate} type="button">
            New definition
          </button>
        </div>
      </div>

      <div className="definitions-grid definitions-grid--page">
        {filtered.length === 0 ? <div className="definitions-empty">No definitions match your search yet.</div> : null}

        {filtered.map((project) => (
          <article
            className={`definitions-card${project.id === activeProjectId ? " definitions-card--active" : ""}`}
            key={project.id}
            onClick={() => router.push(`/definitions/${project.id}`)}
          >
            <div className="definitions-card__thumb">
              <svg className="definitions-card__icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 56 56">
                <path d="M10 38 L18 18 L28 26 L42 16 L46 40" />
                <path d="M14 44 Q24 20, 42 32" />
                <path d="M14 18 L14 44 L42 44 L42 22" />
              </svg>
              {project.id === activeProjectId ? <div className="definitions-card__badge">recent</div> : null}
              {canEditProject(project.id) ? <div className="definitions-card__actions">
                <button
                  className="definitions-card__btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    setProjectVisibility(project.id, !project.isPublic);
                  }}
                  type="button"
                >
                  {project.isPublic ? "private" : "public"}
                </button>
                <button
                  className="definitions-card__btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingId(project.id);
                    setEditName(project.name);
                  }}
                  type="button"
                >
                  rename
                </button>
                <button
                  className="definitions-card__btn definitions-card__btn--danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteProject(project.id);
                    if (editingId === project.id) {
                      setEditingId(null);
                    }
                  }}
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
                    if (event.key === "Enter") {
                      handleRenameSubmit(project.id);
                    }

                    if (event.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  value={editName}
                />
              ) : (
                <span className="definitions-card__name">{project.name}</span>
              )}

              <div className="definitions-card__meta">
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>{new Date(project.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {project.isPublic ? <span>public</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
