"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { AppNavbar } from "@/components/organisms/AppNavbar";
import { DefinitionsBrowser } from "@/components/organisms/DefinitionsBrowser";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProjectsProvider, useProjects } from "@/components/providers/ProjectsProvider";

function DefinitionsBrowserScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { activeProjectId } = useProjects();
  const userLabel = useMemo(() => user?.displayName || user?.email || null, [user]);

  return (
    <main className="definitions-browser-page">
      <div className="landing-page__backdrop" />
      <div className="landing-page__scroll definitions-browser-page__scroll">
        <AppNavbar
          onLogout={() => {
            void logout();
            router.push("/");
          }}
          primaryLink={activeProjectId ? { href: `/definitions/${activeProjectId}`, label: "Resume latest" } : undefined}
          userLabel={userLabel}
        />

        <DefinitionsBrowser />
      </div>
    </main>
  );
}

export function DefinitionsBrowserPage() {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <div className="route-status">Loading your workspace...</div>;
  }

  return (
    <ProjectsProvider>
      <DefinitionsBrowserScreen />
    </ProjectsProvider>
  );
}