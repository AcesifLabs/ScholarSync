'use client';

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { signIn } from "@/app/api/auth";
import { Avatar } from "@/app/ui/components/Avatar";
import { toastError } from "@/app/lib/utils/toast";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Keyboard, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { GoogleMark } from "@/app/ui/components/icons/GoogleMark";
import { openShortcuts } from "@/app/ui/components/KeyboardShortcuts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GoogleOAuth() {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    if (isLoading) {
        return <Skeleton className="size-8 rounded-full" aria-label="Loading account" />;
    }

    if (!user) {
        // The signed-out home has its own sign-in button; a second one in the bar competes with it
        if (pathname === ROUTES.home) return null;
        return (
            <Button variant="outline" size="sm" onClick={() => signIn()}>
                <GoogleMark className="size-4" /> Sign in
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full" aria-label="Account menu">
                {user.avatarUrl ? (
                    <Image src={user.avatarUrl} width={32} height={32} className="rounded-full" alt="" />
                ) : (
                    <Avatar name={user.name} />
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
                        <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system"><Monitor /> Match system</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openShortcuts()}><Keyboard /> Keyboard shortcuts</DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout().then(() => router.push(ROUTES.home), toastError)}>
                    <LogOut /> Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
