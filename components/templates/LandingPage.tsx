"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppNavbar } from "@/components/organisms/AppNavbar";
import { AuthDialog, type AuthMode } from "@/components/organisms/AuthDialog";
import { LandingHero } from "@/components/organisms/LandingHero";
import { useAuth } from "@/components/providers/AuthProvider";

export function LandingPage() {
  const router = useRouter();
  const { loading, logout, user } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const userLabel = useMemo(() => user?.displayName || user?.email || null, [user]);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <main className="landing-page">
      <div className="landing-page__backdrop" />
      <div className="landing-page__scroll">
        <AppNavbar
          onLogin={() => openAuth("login")}
          onLogout={() => {
            void logout();
          }}
          onSignup={() => openAuth("signup")}
          primaryLink={!loading && user ? { href: "/definitions", label: "Browse definitions" } : undefined}
          userLabel={userLabel}
        />

        <LandingHero
          authenticated={!loading && Boolean(user)}
          onLogin={() => openAuth("login")}
          onSignup={() => openAuth("signup")}
        />

        <section className="landing-section" id="learn-more">
          <div className="landing-section__intro">
            <p className="landing-section__eyebrow">Learn more</p>
            <h2>Everything the current studio already does, now with real identity and storage.</h2>
          </div>

          <div className="landing-feature-grid">
            <article className="landing-feature-card">
              <h3>Firebase auth</h3>
              <p>Email/password flows and Google sign-in are ready, with environment variables left for your local .env file.</p>
            </article>
            <article className="landing-feature-card">
              <h3>Definition browser</h3>
              <p>Definitions are fetched from Firestore and open into the same editor with the 3D viewport, floating canvas, and chat.</p>
            </article>
            <article className="landing-feature-card">
              <h3>Atomic structure</h3>
              <p>The new landing, auth, browser, and studio composition live in atoms, molecules, organisms, and templates alongside the existing theme system.</p>
            </article>
          </div>
        </section>
      </div>

      <AuthDialog
        mode={authMode}
        onModeChange={setAuthMode}
        onOpenChange={setIsAuthOpen}
        onSuccess={() => router.push("/definitions")}
        open={isAuthOpen}
      />
    </main>
  );
}