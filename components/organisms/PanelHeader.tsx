"use client";

import { type ReactNode } from "react";

import { TitleBlock } from "@/components/molecules/TitleBlock";

type PanelHeaderProps = {
  actions?: ReactNode;
  eyebrow: string;
  eyebrowClassName?: string;
  title: string;
  titleClassName?: string;
  titleWrapperClassName?: string;
  wrapperClassName?: string;
};

export function PanelHeader({
  actions,
  eyebrow,
  eyebrowClassName,
  title,
  titleClassName,
  titleWrapperClassName,
  wrapperClassName,
}: PanelHeaderProps) {
  return (
    <div className={wrapperClassName}>
      <TitleBlock
        eyebrow={eyebrow}
        eyebrowClassName={eyebrowClassName}
        title={title}
        titleClassName={titleClassName}
        wrapperClassName={titleWrapperClassName}
      />
      {actions}
    </div>
  );
}