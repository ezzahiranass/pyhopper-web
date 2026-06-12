"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export type AuthMode = "login" | "signup";

type AuthDialogProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function normalizeAuthError(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace("Firebase: ", "");
  }

  return "Authentication failed. Check your Firebase configuration.";
}

export function AuthDialog({ mode, onModeChange, onOpenChange, onSuccess, open }: AuthDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            description: "Use your email and password to open your saved definitions.",
            submit: "Log in",
            switchLabel: "Need an account? Sign up",
            title: "Welcome back",
          }
        : {
            description: "Create an account to sync definitions to Firestore and keep working across sessions.",
            submit: "Create account",
            switchLabel: "Already have an account? Log in",
            title: "Create your account",
          },
    [mode],
  );

  if (!open) {
    return null;
  }

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "login") {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          const credentials = await createUserWithEmailAndPassword(auth, email, password);

          if (name.trim()) {
            await updateProfile(credentials.user, { displayName: name.trim() });
          }
        }

        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } catch (submitError) {
        setError(normalizeAuthError(submitError));
      }
    });
  };

  const handleGoogle = () => {
    setError(null);

    startTransition(async () => {
      try {
        await signInWithPopup(auth, googleProvider);
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } catch (submitError) {
        setError(normalizeAuthError(submitError));
      }
    });
  };

  return (
    <div aria-modal="true" className="auth-dialog" role="dialog" onClick={handleClose}>
      <div className="auth-dialog__card" onClick={(event) => event.stopPropagation()}>
        <button aria-label="Close authentication dialog" className="auth-dialog__close" onClick={handleClose} type="button">
          ×
        </button>

        <div className="auth-dialog__header">
          <p className="auth-dialog__eyebrow">Account</p>
          <h2 className="auth-dialog__title">{copy.title}</h2>
          <p className="auth-dialog__description">{copy.description}</p>
        </div>

        <form className="auth-dialog__form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label className="auth-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Amina Bennani"
                type="text"
                value={name}
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@pyhopper.app"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="auth-dialog__error">{error}</p> : null}

          <button className="marketing-button marketing-button--primary auth-dialog__submit" disabled={isPending} type="submit">
            {isPending ? "Working..." : copy.submit}
          </button>
        </form>

        <div className="auth-dialog__divider">
          <span>or continue with Google</span>
        </div>

        <button className="marketing-button marketing-button--ghost auth-dialog__google" disabled={isPending} onClick={handleGoogle} type="button">
          Continue with Google
        </button>

        <button
          className="auth-dialog__switch"
          onClick={() => {
            resetForm();
            onModeChange(mode === "login" ? "signup" : "login");
          }}
          type="button"
        >
          {copy.switchLabel}
        </button>
      </div>
    </div>
  );
}