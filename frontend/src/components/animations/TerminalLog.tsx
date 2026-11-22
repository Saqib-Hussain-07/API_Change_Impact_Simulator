/**
 * TerminalLog — typewriter line-by-line output for mock logs.
 * Shows BLOCKED (red) or APPROVED (green) gate badge at the end.
 * Static fallback for reduced motion: all lines appear at once.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface TerminalLogProps {
  logs: string[];
  severity: 'BREAKING' | 'WARNING' | 'SAFE';
  isRunning: boolean;
  onComplete: () => void;
}

function lineClass(log: string): string {
  if (log.includes('BLOCKED') || log.includes('✗'))
    return 'text-red-400 font-medium';
  if (log.includes('APPROVED') || log.includes('✓'))
    return 'text-emerald-400 font-medium';
  return 'text-zinc-400';
}

export function TerminalLog({ logs, severity, isRunning, onComplete }: TerminalLogProps) {
  const prefersReduced = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(0);
  const [showGate, setShowGate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    if (prefersReduced) {
      const t = setTimeout(() => {
        setVisibleCount(logs.length);
        setShowGate(true);
        onComplete();
      }, 0);
      return () => clearTimeout(t);
    }

    let count = 0;
    function tick() {
      count++;
      setVisibleCount(count);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      if (count < logs.length) {
        timerRef.current = setTimeout(tick, 220 + Math.random() * 120);
      } else {
        // Show gate badge after last line
        timerRef.current = setTimeout(() => {
          setShowGate(true);
          onComplete();
        }, 400);
      }
    }

    timerRef.current = setTimeout(() => {
      setVisibleCount(0);
      setShowGate(false);
      tick();
    }, 150);

    return cleanup;
  }, [isRunning, logs, prefersReduced, onComplete, cleanup]);

  const isBlocked = severity === 'BREAKING' || severity === 'WARNING';

  return (
    <div className="vyro-card p-3 bg-[#0c0c0e] border-black/20 text-zinc-200 shadow-md">
      {/* Terminal header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 mb-2 text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-600" />
          <span className="font-semibold text-zinc-300">prism-runner.log</span>
        </div>
        <span>Port :dynamic</span>
      </div>

      {/* Log lines */}
      <div ref={scrollRef} className="font-mono text-[11px] space-y-0.5 h-32 overflow-y-auto">
        {!isRunning && visibleCount === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
            Run mock validation to inspect Newman logs
          </div>
        ) : (
          <>
            {logs.slice(0, visibleCount).map((log, idx) => (
              <div key={idx} className={lineClass(log)}>
                {log}
              </div>
            ))}

            {/* Blinking cursor while typing */}
            {isRunning && visibleCount < logs.length && (
              <span className="inline-block w-1.5 h-3 bg-zinc-400 animate-pulse" />
            )}

            {/* Gate badge */}
            {showGate && (
              <motion.div
                className="mt-2 pt-2 border-t border-zinc-800"
                initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded ${
                    isBlocked
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBlocked ? 'bg-red-400' : 'bg-emerald-400'
                    }`}
                  />
                  Release gate: {isBlocked ? 'BLOCKED' : 'APPROVED'}
                </span>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
