"use client";

type CatalogTabButtonProps = {
  active: boolean;
  className?: string;
  activeClassName?: string;
  label: string;
  onClick: () => void;
};

export function CatalogTabButton({
  active,
  activeClassName,
  className,
  label,
  onClick,
}: CatalogTabButtonProps) {
  const resolvedClassName = `${className ?? ""}${active && activeClassName ? ` ${activeClassName}` : ""}`.trim();

  return (
    <button className={resolvedClassName} onClick={onClick} type="button">
      {label}
    </button>
  );
}