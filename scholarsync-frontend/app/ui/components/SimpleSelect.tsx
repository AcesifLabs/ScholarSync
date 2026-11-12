'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
    value: T;
    onValueChange: (value: T) => void;
    options: readonly Option<T>[];
    "aria-label": string;
    className?: string;
    size?: "default" | "sm";
};

/** A value/label select; the common case of the Base UI select without its boilerplate. */
export function SimpleSelect<T extends string>({ value, onValueChange, options, className, size = "default", ...rest }: Props<T>) {
    return (
        <Select items={options} value={value} onValueChange={next => next != null && onValueChange(next as T)}>
            <SelectTrigger aria-label={rest["aria-label"]} size={size} className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}
