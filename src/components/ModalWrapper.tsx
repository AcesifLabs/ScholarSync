import React from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ModalWrapperProps {
    isOpen: boolean;
    children: React.ReactNode;
}

/**
 * A logic-only wrapper that handles body scroll locking and visibility.
 * Does not provide any styling.
 */
export const ModalWrapper: React.FC<ModalWrapperProps> = ({ isOpen, children }) => {
    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    return <>{children}</>;
};
