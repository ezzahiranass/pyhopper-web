"use client";

import Link from "next/link";

type LandingHeroProps = {
  authenticated: boolean;
  onLogin: () => void;
  onSignup: () => void;
};

export function LandingHero({ authenticated, onLogin, onSignup }: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div className="landing-hero__copy">
        <p className="landing-hero__eyebrow">Pyhopper Web</p>
        <h1 className="landing-hero__title">Build parametric definitions with a real browser studio.</h1>
        <p className="landing-hero__description">
          Design in the floating XYFlow canvas, inspect the generated 3D geometry, and keep every definition synced to your Firebase-backed workspace.
        </p>

        <div className="landing-hero__actions">
          {authenticated ? (
            <>
              <Link className="marketing-button marketing-button--primary" href="/definitions">
                Browse definitions
              </Link>
              <a className="marketing-button marketing-button--ghost" href="#learn-more">
                Learn more
              </a>
            </>
          ) : (
            <>
              <button className="marketing-button marketing-button--primary" onClick={onLogin} type="button">
                Log in
              </button>
              <button className="marketing-button marketing-button--ghost" onClick={onSignup} type="button">
                Sign up
              </button>
            </>
          )}
        </div>
      </div>

      <div className="landing-hero__panel">
        <div className="landing-hero__panel-header">
          <span />
          <span />
          <span />
        </div>
        <div className="landing-hero__panel-body">
          <div className="landing-stat">
            <strong>Definitions</strong>
            <span>Public and private definitions backed by top-level Firestore artifacts</span>
          </div>
          <div className="landing-stat">
            <strong>Viewport</strong>
            <span>Existing Three.js scene and render manifest workflow preserved</span>
          </div>
          <div className="landing-stat">
            <strong>Authoring</strong>
            <span>Same floating canvas, previews, export flow, and AI chat workspace</span>
          </div>
        </div>
      </div>
    </section>
  );
}
