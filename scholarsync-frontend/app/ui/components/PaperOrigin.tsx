'use client';

import { createContext, useContext } from "react";
import type { PaperOrigin } from "@/app/lib/utils/paper";

const OriginContext = createContext<PaperOrigin | undefined>(undefined);

/** Paper links inside carry this origin, so the paper page's back link returns here. */
export const PaperOriginProvider = OriginContext.Provider;
export const usePaperOrigin = () => useContext(OriginContext);
