"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type ContextMenuProps = {
  children: ReactNode;
  submenuSide?: "left" | "right";
  x: number;
  y: number;
};

type ContextMenuItemProps = {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  onClick: () => void;
};

type ContextMenuSubmenuProps = {
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
};

export function ContextMenu({ children, submenuSide = "right", x, y }: ContextMenuProps) {
  return (
    <div className="context-menu" data-submenu-side={submenuSide} role="menu" style={{ left: x, top: y }}>
      {children}
    </div>
  );
}

export function ContextMenuItem({
  active = false,
  children,
  disabled = false,
  icon,
  onClick,
}: ContextMenuItemProps) {
  return (
    <button
      className={`context-menu__item${active ? " context-menu__item--active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {icon ? <span className="context-menu__icon">{icon}</span> : null}
      <span className="context-menu__label">{children}</span>
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="context-menu__separator" role="separator" />;
}

export function ContextMenuSubmenu({ children, disabled = false, icon, label }: ContextMenuSubmenuProps) {
  return (
    <div className={`context-menu__submenu${disabled ? " context-menu__submenu--disabled" : ""}`}>
      <button className="context-menu__item context-menu__submenu-trigger" disabled={disabled} role="menuitem" type="button">
        {icon ? <span className="context-menu__icon">{icon}</span> : null}
        <span className="context-menu__label">{label}</span>
        <ChevronRight className="context-menu__chevron" />
      </button>
      {!disabled ? <div className="context-menu context-menu__submenu-panel" role="menu">{children}</div> : null}
    </div>
  );
}
