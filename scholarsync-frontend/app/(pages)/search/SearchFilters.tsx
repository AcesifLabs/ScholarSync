'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FIELDS_OF_STUDY, PUBLICATION_TYPES } from "@/app/lib/constants/sources.constants";
import { MAX_YEAR, MIN_YEAR } from "@/app/lib/constants/search.constants";
import { parseNonNegativeInt, SearchState, toggleValue } from "@/app/lib/utils/search";

type Props = { state: SearchState; onChange: (patch: Partial<SearchState>) => void };

const COLLAPSED_COUNT = 6;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="flex flex-col gap-2.5 border-b pb-5 last:border-b-0">
            <legend className="mb-2.5 text-sm font-semibold text-foreground">{title}</legend>
            {children}
        </fieldset>
    );
}

function CheckList({ options, selected, onToggle }: { options: { value: string; label: string }[]; selected: string[]; onToggle: (value: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    // Selected options stay visible even when the list is collapsed
    const visible = expanded ? options : options.filter((o, i) => i < COLLAPSED_COUNT || selected.includes(o.value));
    return (
        <div className="flex flex-col gap-2">
            {visible.map(option => (
                <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={selected.includes(option.value)} onCheckedChange={() => onToggle(option.value)} />
                    {option.label}
                </label>
            ))}
            {options.length > COLLAPSED_COUNT && (
                <Button variant="link" size="xs" className="self-start px-0 text-muted-foreground hover:text-foreground" aria-expanded={expanded} onClick={() => setExpanded(e => !e)}>
                    {expanded ? "Show fewer" : `Show all ${options.length}`}
                </Button>
            )}
        </div>
    );
}

export function SearchFilters({ state, onChange }: Props) {
    const [years, setYears] = useState<number[]>([state.yearFrom ?? MIN_YEAR, state.yearTo ?? MAX_YEAR]);
    // Every change resets to page 1, so only commit values that actually changed (blur fires on plain tabbing)
    const commitCitations = (raw: string) => {
        const value = parseNonNegativeInt(raw);
        if (value !== state.minCitations) onChange({ minCitations: value });
    };
    // A typed year moves its end of the range; out-of-range or reversed input is clamped
    const commitYear = (end: 0 | 1, raw: string) => {
        const typed = parseNonNegativeInt(raw);
        if (typed === undefined) return;
        const next = [...years];
        next[end] = Math.min(MAX_YEAR, Math.max(MIN_YEAR, typed));
        const [from, to] = next[0] <= next[1] ? next : [next[1], next[0]];
        setYears([from, to]);
        const yearFrom = from === MIN_YEAR ? undefined : from;
        const yearTo = to === MAX_YEAR ? undefined : to;
        if (yearFrom !== state.yearFrom || yearTo !== state.yearTo) onChange({ yearFrom, yearTo });
    };
    const commitVenue = (raw: string) => {
        const value = raw.trim() || undefined;
        if (value !== state.venue) onChange({ venue: value });
    };

    return (
        <div className="flex flex-col gap-5" aria-label="Search filters">
            <Section title="Publication year">
                <Slider
                    min={MIN_YEAR}
                    max={MAX_YEAR}
                    value={years}
                    onValueChange={value => setYears(value as number[])}
                    onValueCommitted={value => {
                        const [from, to] = value as number[];
                        onChange({ yearFrom: from === MIN_YEAR ? undefined : from, yearTo: to === MAX_YEAR ? undefined : to });
                    }}
                    aria-label="Publication year range"
                />
                <div className="flex items-center gap-2 text-sm">
                    {([0, 1] as const).map(i => (
                        <React.Fragment key={i}>
                            {i === 1 && <span className="text-muted-foreground" aria-hidden>–</span>}
                            <Input
                                key={`${i}-${years[i]}`}
                                inputMode="numeric"
                                aria-label={i === 0 ? "From year" : "To year"}
                                defaultValue={years[i]}
                                className="h-7 w-full text-center tabular-nums md:text-sm"
                                onBlur={e => commitYear(i, e.target.value)}
                                onKeyDown={e => e.key === "Enter" && commitYear(i, e.currentTarget.value)}
                            />
                        </React.Fragment>
                    ))}
                </div>
            </Section>

            <Section title="Access">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={state.openAccess} onCheckedChange={checked => onChange({ openAccess: checked === true })} />
                    Open access PDF only
                </label>
            </Section>

            <Section title="Minimum citations">
                <Input
                    key={state.minCitations ?? ''}
                    type="number"
                    min={0}
                    placeholder="Any"
                    aria-label="Minimum citations"
                    defaultValue={state.minCitations ?? ''}
                    onBlur={e => commitCitations(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && commitCitations(e.currentTarget.value)}
                />
            </Section>

            <Section title="Venue">
                <Input
                    key={state.venue ?? ''}
                    placeholder="e.g. Nature"
                    aria-label="Venue"
                    defaultValue={state.venue ?? ''}
                    onBlur={e => commitVenue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && commitVenue(e.currentTarget.value)}
                />
            </Section>

            <Section title="Field of study">
                <CheckList
                    options={FIELDS_OF_STUDY}
                    selected={state.fields}
                    onToggle={field => onChange({ fields: toggleValue(state.fields, field) })}
                />
            </Section>

            <Section title="Paper type">
                <CheckList options={PUBLICATION_TYPES} selected={state.types} onToggle={type => onChange({ types: toggleValue(state.types, type) })} />
            </Section>
        </div>
    );
}
