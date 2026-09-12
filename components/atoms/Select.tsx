"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption<T extends string> = {
  disabled?: boolean;
  label: string;
  value: T;
};

type SelectProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  value: T;
};

type MenuPlacement = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 5;
const MENU_MAX_HEIGHT = 220;
const OPTION_HEIGHT = 30;
const MENU_CHROME_HEIGHT = 10;

export function Select<T extends string>({
  ariaLabel,
  className,
  disabled = false,
  onChange,
  options,
  value,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const selectedOption = options.find((option) => option.value === value);

  const calculatePlacement = () => {
    const trigger = rootRef.current?.getBoundingClientRect();
    if (!trigger) return null;

    const desiredHeight = Math.min(options.length * OPTION_HEIGHT + MENU_CHROME_HEIGHT, MENU_MAX_HEIGHT);
    const spaceBelow = window.innerHeight - trigger.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = trigger.top - MENU_GAP - VIEWPORT_MARGIN;
    const openAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const availableHeight = Math.max(openAbove ? spaceAbove : spaceBelow, OPTION_HEIGHT + MENU_CHROME_HEIGHT);
    const menuHeight = Math.min(desiredHeight, availableHeight);
    const width = Math.min(trigger.width, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(
      Math.max(trigger.left, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );

    return {
      left,
      maxHeight: availableHeight,
      top: openAbove ? trigger.top - MENU_GAP - menuHeight : trigger.bottom + MENU_GAP,
      width,
    };
  };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleViewportChange() {
      if (open) setPlacement(calculatePlacement());
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  });

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setPlacement(calculatePlacement());
    setOpen(true);
  };

  return (
    <div className={`select${className ? ` ${className}` : ""}`} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="select__trigger"
        disabled={disabled}
        onClick={toggleOpen}
        type="button"
      >
        <span className="select__value">{selectedOption?.label ?? value}</span>
        <ChevronDown aria-hidden="true" className="select__chevron" />
      </button>
      {open && placement
        ? createPortal(
            <div
              aria-label={ariaLabel}
              className="select__menu select__menu--portal"
              data-floating-select-menu
              id={menuId}
              ref={menuRef}
              role="listbox"
              style={placement}
            >
              {options.map((option) => (
                <button
                  aria-selected={option.value === value}
                  className="select__option"
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Check aria-hidden="true" /> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
