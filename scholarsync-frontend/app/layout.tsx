import type { Metadata } from "next";
import React from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { TanStackProvider } from "@/app/lib/providers/TanStackProvider";
import { AuthProvider } from "@/app/lib/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], display: "swap", variable: "--font-source-serif" });

export const metadata: Metadata = {
    title: { default: "ScholarSync", template: "%s · ScholarSync" },
    description: "Find, organise, read and discuss academic papers in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        // next-themes sets the theme class on <html> before hydration
        <html lang="en" className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`} suppressHydrationWarning>
            {/* Extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before React hydrates */}
            <body className="min-h-full flex flex-col" suppressHydrationWarning>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <TanStackProvider>
                        <AuthProvider>
                            {children}
                            <Toaster position="bottom-right" richColors />
                        </AuthProvider>
                    </TanStackProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
