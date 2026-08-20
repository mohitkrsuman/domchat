"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type MenuPosition = { top: number; left: number; width: number };

export function CustomSelect<T extends string>({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id?: string;
  label?: string;
  value: T;
  options: SelectOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listId = `${selectId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = menuRef.current?.offsetHeight ?? 140;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;
      setPosition({
        top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && position
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            className="custom-select-menu"
            role="listbox"
            aria-labelledby={selectId}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-select-option${isSelected ? " is-selected" : ""}`}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="custom-select-option-label">{option.label}</span>
                    {option.description ? (
                      <span className="custom-select-option-desc">{option.description}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="custom-select" ref={rootRef}>
      {label ? (
        <label className="label" htmlFor={selectId} id={`${selectId}-label`}>
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        className="custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        onClick={() => {
          if (disabled) return;
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
              top: rect.bottom + 6,
              left: rect.left,
              width: rect.width,
            });
          }
          setOpen((v) => !v);
        }}
      >
        <span className="custom-select-value">
          <span className="custom-select-value-label">{selected?.label}</span>
          {selected?.description ? (
            <span className="custom-select-value-desc">{selected.description}</span>
          ) : null}
        </span>
        <span className={`custom-select-chevron${open ? " is-open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}
