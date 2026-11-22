/**
 * HeroBeams — animated SVG diagram showing API hub → consumer nodes.
 * One beam periodically turns red (BREAKING), then resets.
 * Purely decorative, hidden from screen readers.
 * Pauses off-screen and on prefers-reduced-motion.
 */
import { useRef, useState, useEffect } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

const NODES = [
  { label: 'Mobile Team', x: 85, y: 15 },
  { label: 'Analytics', x: 90, y: 40 },
  { label: 'Payments', x: 85, y: 65 },
  { label: 'Web App', x: 90, y: 88 },
];

const HUB = { x: 15, y: 50 };

export function HeroBeams() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-50px' });
  const prefersReduced = useReducedMotion();
  const [breakingIdx, setBreakingIdx] = useState(-1);

  // Cycle through nodes, briefly marking one as "breaking"
  useEffect(() => {
    if (!isInView || prefersReduced) return;
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      if (tick % 8 < 2) {
        // Show breaking on node (tick/8) % NODES.length
        setBreakingIdx(Math.floor(tick / 8) % NODES.length);
      } else {
        setBreakingIdx(-1);
      }
    }, 600);
    return () => clearInterval(id);
  }, [isInView, prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-[0.07]"
      >
        {NODES.map((node, i) => {
          const isBreaking = breakingIdx === i;
          return (
            <g key={i}>
              {/* Beam line */}
              <motion.line
                x1={HUB.x}
                y1={HUB.y}
                x2={node.x}
                y2={node.y}
                stroke={isBreaking ? '#ef4444' : '#000'}
                strokeWidth={isBreaking ? 0.6 : 0.3}
                strokeDasharray="2 2"
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 1.2, delay: i * 0.2 }}
              />
              {/* Animated dot traveling along beam */}
              {isInView && (
                <motion.circle
                  r={isBreaking ? 1.2 : 0.8}
                  fill={isBreaking ? '#ef4444' : '#000'}
                  initial={{ cx: HUB.x, cy: HUB.y }}
                  animate={{
                    cx: [HUB.x, node.x],
                    cy: [HUB.y, node.y],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              )}
              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={2.5}
                fill="none"
                stroke={isBreaking ? '#ef4444' : '#000'}
                strokeWidth={0.4}
              />
              {/* BREAKING tag */}
              {isBreaking && (
                <motion.text
                  x={node.x}
                  y={node.y - 4}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="2.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  BREAKING
                </motion.text>
              )}
            </g>
          );
        })}
        {/* Hub circle */}
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r={4}
          fill="none"
          stroke="#000"
          strokeWidth={0.5}
        />
        <text
          x={HUB.x}
          y={HUB.y + 0.8}
          textAnchor="middle"
          fill="#000"
          fontSize="2.2"
          fontFamily="monospace"
          fontWeight="bold"
        >
          API
        </text>
      </svg>
    </div>
  );
}
