import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook that alerts clicks outside of the passed ref
 * @param handler Callback to trigger when a click outside is detected
 * @param isOpen Optional flag to only attach listener when open
 * @returns The ref to attach to the element
 */
export const useClickOutside = <T extends HTMLElement>(
    handler: () => void,
    isOpen: boolean = true
): RefObject<T | null> => {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                handler();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, handler]);

    return ref;
};
