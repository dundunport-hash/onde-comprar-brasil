"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type CatalogFilterOption = {
  value: string;
  label: string;
};

export function CatalogFilterDropdown({
  id,
  name,
  initialValue,
  options,
}: {
  id: string;
  name: string;
  initialValue: string;
  options: CatalogFilterOption[];
}) {
  const [value, setValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-background py-2 pl-3 pr-3 text-left text-base text-foreground outline-none transition focus:border-primary/5 focus:ring-2 focus:ring-primary/5 sm:text-sm"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="catalog-dropdown-list absolute left-0 top-[calc(100%+0.25rem)] z-50 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-background py-1 text-sm text-foreground shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setValue(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left transition outline-none hover:bg-primary/10 focus:bg-primary/10 ${
                  isSelected
                    ? "bg-primary/10 font-semibold text-foreground"
                    : "text-foreground"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
