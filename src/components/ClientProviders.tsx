'use client';

import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { UIProvider } from '@/context/UIContext';
import React from "react";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <UIProvider>
                {children}
            </UIProvider>
        </Provider>
    );
}
