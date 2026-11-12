'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, FolderOpen, GraduationCap, House, LibraryBig, ChevronLeft, Search, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "@/app/lib/utils/routes";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { SETTING_KEYS } from "@/app/lib/constants/ui.constants";
import { useLocalSetting } from "@/app/lib/hooks/useLocalSetting";
import { useAuth } from "@/app/lib/providers/AuthProvider";

type NavItem = { href: string; label: string; Icon: LucideIcon };

const SECTIONS: { title: string; items: NavItem[] }[] = [
    {
        title: "Discover",
        items: [
            { href: ROUTES.home, label: "Home", Icon: House },
            { href: ROUTES.search, label: "Search", Icon: Search },
            { href: ROUTES.researchers, label: "Researchers", Icon: GraduationCap },
        ],
    },
    {
        title: "Your work",
        items: [
            { href: ROUTES.library, label: "Library", Icon: LibraryBig },
            { href: ROUTES.collections, label: "Collections", Icon: FolderOpen },
            { href: ROUTES.groups, label: "Reading groups", Icon: Users },
            { href: ROUTES.archive, label: "Archive", Icon: Archive },
        ],
    },
];

/** Navigation list shared by the desktop sidebar and the mobile drawer; {@code compact} shows icons only. */
export function SidebarNav({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
    const pathname = usePathname();
    const { user } = useAuth();
    // "Your work" needs an account, so visitors only see what they can open
    const sections = user ? SECTIONS : SECTIONS.slice(0, 1);

    return (
        <nav className="flex flex-col gap-5" aria-label="Main">
            {sections.map(section => (
                <div key={section.title} className="flex flex-col gap-0.5">
                    {/* Faded rather than removed, so the list doesn't jump when the sidebar collapses; screen readers still get it */}
                    <p className={cn("truncate px-3 pb-1 text-xs font-medium text-muted-foreground transition-opacity", compact && "opacity-0")}>{section.title}</p>
                    {section.items.map(({ href, label, Icon }) => {
                        const active = isNavItemActive(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={onNavigate}
                                aria-current={active ? "page" : undefined}
                                aria-label={compact ? label : undefined}
                                title={compact ? label : undefined}
                                className={cn(
                                    // Fixed padding keeps the icon still (centred in the collapsed width); the label is clipped by the moving edge
                                    "flex h-8 items-center gap-2.5 overflow-hidden rounded-md px-3 text-sm whitespace-nowrap transition-colors",
                                    active ? "bg-accent font-medium text-foreground" : "text-foreground/75 hover:bg-accent/70 hover:text-foreground",
                                )}
                            >
                                <Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
                                <span className={cn("transition-opacity", compact && "opacity-0")}>{label}</span>
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}

/** The signed-out home is the landing page: it gets the whole width, without app navigation. */
export function useShowAppNav() {
    const pathname = usePathname();
    const { user, isLoading } = useAuth();
    return pathname !== ROUTES.home || (!isLoading && !!user);
}

export function Sidebar() {
    const [collapsed, setCollapsed] = useLocalSetting<boolean>(SETTING_KEYS.sidebarCollapsed, false);
    if (!useShowAppNav()) return null;
    return (
        // The wrapper doesn't clip, so the toggle can sit on the corner where the navbar and sidebar borders meet
        <div className="relative hidden shrink-0 md:flex">
            <aside className={cn("flex flex-col overflow-x-hidden overflow-y-auto border-r bg-surface px-2 py-4 transition-[width] motion-reduce:transition-none", collapsed ? "w-14" : "w-56")}>
                <SidebarNav compact={collapsed} />
            </aside>
            <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="absolute -top-3 -right-3 z-20 flex size-6 items-center justify-center rounded-full border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
            >
                <ChevronLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} aria-hidden />
            </button>
        </div>
    );
}
