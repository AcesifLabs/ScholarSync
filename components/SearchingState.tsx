import React from 'react';
import { GraduationCap } from 'lucide-react';

export const SearchingState: React.FC = () => {
    return (
        <div className="py-24 flex flex-col items-center justify-center space-y-8">
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Animated Outer Ring */}
                <div className="absolute inset-0 border-4 border-scholar-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-scholar-600 rounded-full animate-spin"></div>

                {/* Inner Pulsing Icon */}
                <div className="bg-scholar-50 p-4 rounded-full animate-pulse shadow-sm">
                    <GraduationCap size={32} className="text-scholar-600" />
                </div>
            </div>

            <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                    Searching
                    <span className="flex gap-1 ml-0.5">
                        <span className="w-1.5 h-1.5 bg-scholar-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-scholar-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-scholar-600 rounded-full animate-bounce"></span>
                    </span>
                </h2>
                <p className="text-slate-500 font-medium max-w-xs mx-auto animate-pulse">
                    Sifting through millions of open-access papers just for you...
                </p>
            </div>

            {/* Progress Bar Mockup */}
            <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-scholar-500 via-violet-500 to-scholar-500 w-full animate-progress-shimmer"></div>
            </div>
        </div>
    );
};
