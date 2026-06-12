"use client";

type CatalogCardProps = {
  className?: string;
  label: string;
  onClick: () => void;
  title?: string;
};
export function CatalogCard({ className, label, onClick, title }: CatalogCardProps) {
  return (
    <button className={className} onClick={onClick} title={title} type="button">
      <span className="component-browser__card-title">{label}</span>
    </button>
  );
}