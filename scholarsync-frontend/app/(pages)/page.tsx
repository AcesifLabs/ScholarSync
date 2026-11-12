'use client';

import { Suspense } from "react";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { Dashboard, DashboardSkeleton } from "./Dashboard";
import { Landing } from "./Landing";

export default function HomePage() {
    const { user, isLoading } = useAuth();
    if (isLoading) return <PageContainer><DashboardSkeleton /></PageContainer>;
    if (!user) return <Suspense><Landing /></Suspense>;
    return (
        <PageContainer>
            <Dashboard />
        </PageContainer>
    );
}
