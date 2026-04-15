import React from "react";
import {Field} from "@/components/ui/field";

export interface ComponentStyleProps extends React.ComponentPropsWithoutRef<typeof Field> {
    className?: string;
}
