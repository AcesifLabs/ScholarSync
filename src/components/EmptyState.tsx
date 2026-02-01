import React from 'react';

interface EmptyStateProps {
    onStartSearching?: () => void;
    message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    onStartSearching,
    message = "No papers in this list yet."
}) => {
    return (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">{message}</p>
            {onStartSearching && (
                <button
                    onClick={onStartSearching}
                    className="mt-4 text-scholar-600 font-medium hover:underline"
                >
                    Start searching
                </button>
            )}
        </div>
    );
};
