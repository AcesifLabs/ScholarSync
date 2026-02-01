'use client';

import React from 'react';
import { X } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import { UI_TEXT } from '@/constants/appText';
import { GoogleIcon } from './icons/GoogleIcon';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleGoogleSignIn = async () => {
        // Store current path for redirect after auth
        const currentPath = window.location.pathname + window.location.search;
        
        await signIn.social({
            provider: "google",
            callbackURL: currentPath,
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scaleIn overflow-hidden border border-slate-100">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center space-y-6 pt-2">
                    <div className="w-16 h-16 bg-scholar-50 rounded-full flex items-center justify-center mx-auto">
                        <GoogleIcon size={32} />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-800">You need to be logged in</h2>
                        <p className="text-slate-500">
                            Please sign in with Google to create reading lists and save research papers to your library.
                        </p>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 px-6 py-3.5 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98]"
                    >
                        <GoogleIcon />
                        <span>Continue with Google</span>
                    </button>
                    
                    <p className="text-xs text-slate-400">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
};
