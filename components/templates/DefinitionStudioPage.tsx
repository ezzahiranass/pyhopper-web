"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { ProjectsProvider, useProjects } from "@/components/providers/ProjectsProvider";
import { StudioWorkspace } from "@/components/templates/StudioWorkspace";

function DefinitionStudioScreen({ definitionId }: { definitionId: string }) {
  const { isHydrated, projectDocuments } = useProjects();

  if (!isHydrated) {
    return <div className="route-status">Loading definition...</div>;
  }

  if (!projectDocuments[definitionId]) {
    return (
      <main className="route-status route-status--full">
        <div className="route-status__card">
          <h1>Definition not found</h1>
          <p>The requested definition is not available in your Firestore workspace.</p>
          <Link className="marketing-button marketing-button--primary" href="/definitions">
            Back to definitions
          </Link>
        </div>
      </main>
    );
  }

  return <StudioWorkspace projectId={definitionId} />;
}

export function DefinitionStudioPage({ definitionId }: { definitionId: string }) {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <div className="route-status route-status--full">Loading definition...</div>;
  }

  return (
    <ProjectsProvider initialActiveProjectId={definitionId}>
      <DefinitionStudioScreen definitionId={definitionId} />
    </ProjectsProvider>
  );
}