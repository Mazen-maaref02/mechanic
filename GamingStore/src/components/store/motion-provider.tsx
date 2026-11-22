"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Global motion preferences: honors the OS "reduced motion" setting. */
export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
