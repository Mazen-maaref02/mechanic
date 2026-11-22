"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { KeyRound, Copy, Check, Eye, EyeOff } from "lucide-react";

/**
 * Owner-only key display. Rendered from the server for the buyer's own
 * delivered order item — never logged, never in public APIs.
 */
export const KeyReveal = ({ value }: { value: string }) => {
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setRevealed(true); // clipboard unavailable — show the text instead
    }
  };

  const masked = `••••••••-${value.slice(-6)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2.5"
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
        <KeyRound className="h-3.5 w-3.5" /> Your key
      </span>
      <code
        className="min-w-0 flex-1 truncate select-all font-mono text-sm text-foreground"
        aria-label="Activation key"
      >
        {revealed ? value : masked}
      </code>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide key" : "Reveal key"}
          className="rounded-md p-1.5 text-foreground-dim transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy key to clipboard"
          className="rounded-md p-1.5 text-foreground-dim transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </span>
    </motion.div>
  );
};
