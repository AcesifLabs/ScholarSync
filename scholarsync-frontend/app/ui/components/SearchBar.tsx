import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {Search} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import {ComponentStyleProps} from "@/app/lib/types/shared.types";

export function SearchBar({ className, ...props }: ComponentStyleProps) {
    return (
        <Field
            orientation="horizontal"
            className={cn("gap-0", className)}
            {...props}
        >
            <Input
                type="search"
                className="py-5 px-4 text-lg focus-visible:ring-0 focus:ring-0 focus-visible:border-gray-200 bg-[#F7FAFC] border-r-0 rounded-l-inherit"
                placeholder="Search Papers"
            />
            <Button
                className="bg-[#F7FAFC] border-gray-200 border-l-0 py-5 px-4 cursor-pointer rounded-r-inherit text-black"
            >
                <Search />
            </Button>
        </Field>
    );
}
