import React from "react";

type PageHeaderProps = {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    /** A back link shown above the title. */
    back?: React.ReactNode;
};

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
                {back && <div className="text-sm text-muted-foreground">{back}</div>}
                <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
                {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
