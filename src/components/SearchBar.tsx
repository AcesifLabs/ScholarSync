import React from 'react';
import { Search } from 'lucide-react';

import { SearchBarProps } from '@/types';
import { UI_TEXT } from '@/constants/appText';

export const SearchBar: React.FC<SearchBarProps> = ({
    query,
    onChange,
    onSearch,
    isLoading,
    isSticky = false,
    isPagination = false
}) => {
    return (
        <form onSubmit={onSearch} className={`w-full relative ${isSticky ? '' : 'max-w-2xl'}`}>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className={`h-5 w-5 ${isSticky ? 'text-slate-500' : 'text-slate-400'} group-focus-within:text-scholar-500 transition-colors`} />
                </div>
                <input
                    id="search-input"
                    type="text"
                    value={query}
                    onChange={(e) => onChange(e.target.value)}
                    className={`block w-full pl-11 pr-4 ${isSticky ? 'py-3 text-base' : 'py-4 text-lg'} bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-scholar-500/20 focus:border-scholar-500 transition-all`}
                    placeholder={UI_TEXT.SEARCH_PLACEHOLDER}
                />
                <button
                    type="submit"
                    className={`absolute right-2 top-2 bottom-2 bg-scholar-600 text-white rounded-xl font-medium hover:bg-scholar-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSticky ? 'px-4 text-sm' : 'px-6'} flex items-center justify-center min-w-[80px]`}
                    disabled={!query.trim()}
                >
                    {isLoading && !isPagination ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Search'}
                </button>
            </div>
        </form>
    );
};
