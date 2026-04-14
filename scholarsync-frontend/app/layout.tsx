import type { Metadata } from "next";
import {Raleway} from "next/font/google";
import "./globals.css";
import React from "react";
import TanStackProvider from "@/app/lib/providers/TanStackProvider";
import {AuthProvider} from "@/app/lib/providers/AuthProvider";

const raleway = Raleway({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-raleway',
});

export const metadata: Metadata = {
  title: "ScholarSync",
  description: "Your Hub for academic research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TanStackProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </TanStackProvider>
      </body>
    </html>
  );
}
