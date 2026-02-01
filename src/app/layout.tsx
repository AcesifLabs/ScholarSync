import '../index.css';
import ClientProviders from '../components/ClientProviders';
import { Metadata } from 'next';
import React from "react";

export const metadata: Metadata = {
    title: 'ScholarSync',
    description: 'AI-Powered Research Paper Assistant',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-slate-50 min-h-screen text-slate-900 font-sans antialiased">
                <ClientProviders>
                    {children}
                </ClientProviders>
            </body>
        </html>
    );
}
