'use client';

import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { getGoogleAuthUrl } from "@/app/api/auth";
import Image from "next/image";

export function GoogleOAuth() {
    const { user, isLoading } = useAuth();

    const handleLogin = () => {
        if (!user && !isLoading) {
            window.location.href = getGoogleAuthUrl();
        }
    };

    return (
        <button
            onClick={handleLogin}
            disabled={isLoading}
            className="flex w-fit rounded-full items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {user ? (
                        <div className="flex items-center gap-2">
                            <Image src={user?.avatarUrl ?? ""} width={25} height={25} className="rounded-full" alt="profile-picture" />
                        </div>
                        )
                    : <FcGoogle size={20} />}
                </>
            )}
        </button>
    );
}
