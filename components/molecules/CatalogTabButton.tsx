"use client";

type CatalogTabButtonProps = {
  active: boolean;
  className?: string;
  activeClassName?: string;
  label: string;
  onClick: () => void;
  title?: string;
};

export function CatalogTabButton({
  active,
  activeClassName,
  className,
  label,
  onClick,
  title,
}: CatalogTabButtonProps) {
  const resolvedClassName = `${className ?? ""}${active && activeClassName ? ` ${activeClassName}` : ""}`.trim();

  return (
    <button className={resolvedClassName} onClick={onClick} title={title} type="button">
      {label}
    </button>
  );
}