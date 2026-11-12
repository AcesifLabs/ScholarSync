'use client';

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

type Props<T extends string | number> = {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
};

/** Small radio group shown as joined buttons; arrow keys move the selection like native radios. */
export function Segmented<T extends string | number>({ label, value, options, onChange }: Props<T>) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const index = options.findIndex(o => o.value === value);

    const onKeyDown = (e: React.KeyboardEvent) => {
        const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!delta) return;
        e.preventDefault();
        const next = (index + delta + options.length) % options.length;
        onChange(options[next].value);
        refs.current[next]?.focus();
    };

    return (
        <div className="inline-flex items-center gap-2">
        <span className="text-xs text-muted-foreground" aria-hidden>{label}</span>
        <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="inline-flex rounded-lg bg-muted p-[3px]">
            {options.map((option, i) => {
                const checked = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        ref={el => { refs.current[i] = el; }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "rounded-md px-2.5 py-0.5 text-sm transition-colors",
                            checked ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
        </div>
    );
}
