"use client";

type SceneActionButtonProps = {
  busy: boolean;
  onClick: () => void;
};

export function SceneActionButton({ busy, onClick }: SceneActionButtonProps) {
  return (
    <button
      className="scene-action-button"
      disabled={busy}
      onClick={onClick}
      title="Run API test and load the generated GLB"
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M7 5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-2.26 1.3l-3.24-1.86-3.24 1.86A1.5 1.5 0 0 1 6 18.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M10 9.25v5.5l4-2.75z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
