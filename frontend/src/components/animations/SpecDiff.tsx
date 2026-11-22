/**
 * SpecDiff — animated diff view for old/new spec snippets.
 * Removed lines collapse with red highlight, added lines wipe in with green.
 * Re-animates when scenario changes (key-driven).
 * Static fallback for reduced motion.
 */
import { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface SpecDiffProps {
  oldSnippet: string;
  newSnippet: string;
  scenarioId: string;
}

interface DiffLine {
  type: 'same' | 'removed' | 'added';
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-free diff: match by content, then mark remainders
  const usedNew = new Set<number>();

  for (const ol of oldLines) {
    const matchIdx = newLines.findIndex((nl, idx) => !usedNew.has(idx) && nl === ol);
    if (matchIdx >= 0) {
      // Flush any added lines before this match
      for (let j = 0; j < newLines.length; j++) {
        if (j < matchIdx && !usedNew.has(j)) {
          result.push({ type: 'added', text: newLines[j] });
          usedNew.add(j);
        }
      }
      result.push({ type: 'same', text: ol });
      usedNew.add(matchIdx);
    } else {
      result.push({ type: 'removed', text: ol });
    }
  }

  // Remaining new lines
  for (let j = 0; j < newLines.length; j++) {
    if (!usedNew.has(j)) {
      result.push({ type: 'added', text: newLines[j] });
    }
  }

  return result;
}

export function SpecDiff({ oldSnippet, newSnippet, scenarioId }: SpecDiffProps) {
  const prefersReduced = useReducedMotion();
  const lines = useMemo(() => computeDiff(oldSnippet, newSnippet), [oldSnippet, newSnippet]);

  return (
    <div className="p-2.5 rounded bg-zinc-50 border border-black/10 font-mono text-[11px] overflow-x-auto h-40">
      <AnimatePresence mode="wait">
        <motion.div
          key={scenarioId}
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {lines.map((line, i) => {
            if (line.type === 'removed') {
              return (
                <motion.div
                  key={`r-${i}`}
                  className="bg-red-50 text-red-700 line-through px-1 rounded"
                  initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <span className="text-red-400 mr-1">−</span>
                  {line.text}
                </motion.div>
              );
            }
            if (line.type === 'added') {
              return (
                <motion.div
                  key={`a-${i}`}
                  className="bg-emerald-50 text-emerald-700 px-1 rounded"
                  initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <span className="text-emerald-400 mr-1">+</span>
                  {line.text}
                </motion.div>
              );
            }
            return (
              <div key={`s-${i}`} className="text-zinc-800 px-1">
                <span className="text-zinc-300 mr-1">&nbsp;</span>
                {line.text}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
