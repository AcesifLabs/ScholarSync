'use client';

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GoogleOAuth } from "@/app/ui/components/GoogleOAuth";
import { Notifications } from "@/app/ui/components/Notifications";
import { SearchDialog } from "@/app/ui/components/SearchDialog";
import { SidebarNav, useShowAppNav } from "@/app/ui/components/Sidebar";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { Wordmark } from "@/app/ui/components/Wordmark";

export function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const showAppNav = useShowAppNav();
    // The Search page has its own field; the landing page sends visitors there with its own link
    const showSearch = pathname !== ROUTES.search && showAppNav;

    return (
        <header className="flex h-(--navbar-h) w-full shrink-0 items-center gap-2 border-b bg-surface px-2 sm:gap-3 sm:px-3">
            {showAppNav && (
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
                    <Menu />
                </Button>
            )}
            <div className={showAppNav ? "min-w-0 md:w-50 md:pl-1" : "min-w-0 pl-2"}><Wordmark /></div>

            <div className="flex-1" />

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {showSearch && <SearchDialog />}
                <Notifications />
                <GoogleOAuth />
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" className="w-72 bg-surface">
                    <SheetHeader><SheetTitle><Wordmark onClick={() => setMenuOpen(false)} /></SheetTitle></SheetHeader>
                    <div className="px-3"><SidebarNav onNavigate={() => setMenuOpen(false)} /></div>
                </SheetContent>
            </Sheet>
        </header>
    );
}
