'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthModal } from '@/components/AuthModal';

interface UIContextType {
    openAuthModal: () => void;
    closeAuthModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);

    return (
        <UIContext.Provider value={{ openAuthModal, closeAuthModal }}>
            {children}
            <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
