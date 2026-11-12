'use client';

import React, { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SearchField } from "@/app/ui/components/SearchField";
import { useAutocomplete } from "@/app/api/papers";
import { useDebouncedValue } from "@/app/lib/hooks/useDebouncedValue";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { SEARCH_DEBOUNCE_MS } from "@/app/lib/constants/timing.constants";
import { AUTOCOMPLETE_LIMIT } from "@/app/lib/constants/pagination.constants";

type Props = { className?: string; defaultValue?: string; size?: "default" | "lg"; autoFocus?: boolean };

export function SearchBar({ className, defaultValue = "", size = "default", autoFocus }: Props) {
    const large = size === "lg";
    const router = useRouter();
    const listId = useId();
    const [value, setValue] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const debounced = useDebouncedValue(value.trim(), SEARCH_DEBOUNCE_MS);
    // Only while the list is open: a remount with the submitted query as defaultValue must not fetch suggestions
    const { data } = useAutocomplete(open ? debounced : "");
    const matches = open ? (data?.matches ?? []).slice(0, AUTOCOMPLETE_LIMIT) : [];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setOpen(false);
        if (active >= 0 && matches[active]) {
            router.push(ROUTES.paper(matches[active].id));
        } else if (value.trim()) {
            router.push(ROUTES.searchFor(value.trim()));
        }
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive(i => Math.min(i + 1, matches.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(i => Math.max(i - 1, -1));
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <SearchField onSubmit={submit} large={large} className={className}>
            <Input
                data-search-input
                autoFocus={autoFocus}
                type="search"
                role="combobox"
                aria-label="Search papers"
                aria-expanded={matches.length > 0}
                aria-controls={listId}
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                autoComplete="off"
                value={value}
                onChange={e => { setValue(e.target.value); setOpen(true); setActive(-1); }}
                onKeyDown={onKeyDown}
                onBlur={() => setOpen(false)}
                className={cn("h-full flex-1 border-0 bg-transparent shadow-none focus-visible:outline-none dark:bg-transparent", large ? "px-3 text-base md:text-base" : "px-2.5 text-sm")}
                placeholder={large ? "Title, topic or author" : "Search by title, topic or author"}
            />
            <Button type="submit" className={cn("shrink-0 px-4", large ? "mr-1.5" : "mr-1")} disabled={!value.trim()}>Search</Button>
            {matches.length > 0 && (
                <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-auto rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 slide-in-from-top-1 motion-quick">
                    {matches.map((match, i) => (
                        <li
                            key={match.id}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === active}
                            // mousedown fires before the input's blur closes the list
                            onMouseDown={e => { e.preventDefault(); setOpen(false); router.push(ROUTES.paper(match.id)); }}
                            className={cn("cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-accent", i === active && "bg-accent")}
                        >
                            <p className="font-medium text-foreground">{match.title}</p>
                            {match.authorsYear && <p className="text-xs text-muted-foreground">{match.authorsYear}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </SearchField>
    );
}
