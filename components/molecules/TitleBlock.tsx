"use client";

type TitleBlockProps = {
  eyebrow: string;
  eyebrowClassName?: string;
  title: string;
  titleClassName?: string;
  wrapperClassName?: string;
};

export function TitleBlock({
  eyebrow,
  eyebrowClassName,
  title,
  titleClassName,
  wrapperClassName,
}: TitleBlockProps) {
  return (
    <div className={wrapperClassName}>
      <p className={eyebrowClassName}>{eyebrow}</p>
      <h2 className={titleClassName}>{title}</h2>
    </div>
  );
}