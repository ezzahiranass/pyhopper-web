"use client";

import Link from "next/link";

type NavbarLink = {
  href: string;
  label: string;
};

type AppNavbarProps = {
  onLogin?: () => void;
  onLogout?: () => void;
  onSignup?: () => void;
  primaryLink?: NavbarLink;
  userLabel?: string | null;
};

export function AppNavbar({ onLogin, onLogout, onSignup, primaryLink, userLabel }: AppNavbarProps) {
  return (
    <header className="app-navbar">
      <Link className="app-navbar__brand" href="/">
        <span className="app-navbar__brand-mark">PH</span>
        <span className="app-navbar__brand-copy">
          <strong>Pyhopper Web</strong>
          <span>Parametric definitions in the browser</span>
        </span>
      </Link>

      <div className="app-navbar__actions">
        {primaryLink ? (
          <Link className="marketing-button marketing-button--primary" href={primaryLink.href}>
            {primaryLink.label}
          </Link>
        ) : null}

        {userLabel ? <span className="app-navbar__user">{userLabel}</span> : null}

        {userLabel ? (
          <button className="marketing-button marketing-button--ghost" onClick={onLogout} type="button">
            Log out
          </button>
        ) : (
          <>
            <button className="marketing-button marketing-button--ghost" onClick={onLogin} type="button">
              Log in
            </button>
            <button className="marketing-button marketing-button--primary" onClick={onSignup} type="button">
              Sign up
            </button>
          </>
        )}
      </div>
    </header>
  );
}