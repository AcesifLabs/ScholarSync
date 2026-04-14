import Navbar from "@/app/ui/components/Navbar";
import Sidebar from "@/app/ui/components/Sidebar";
import React from "react";

export default function UniversalLayout ({ children }: { children: React.ReactNode }) {
    return (
        <section className="flex flex-col h-screen">
            <Navbar />
            <div className="flex flex-1 min-h-0">
                <Sidebar />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </section>
    )
}
