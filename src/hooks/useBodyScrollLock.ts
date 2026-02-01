import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a component (like a modal) is open.
 * @param isOpen Whether the component is open
 */
export const useBodyScrollLock = (isOpen: boolean) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
};
