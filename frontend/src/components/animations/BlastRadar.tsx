/**
 * BlastRadar — concentric SVG rings pulsing for impacted teams.
 * Red for blocked teams, grey for safe/compatible.
 * Pauses off-screen. Static fallback for reduced motion.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

interface Team {
  name: string;
  blocked: boolean;
}

interface BlastRadarProps {
  teams: Team[];
}

export function BlastRadar({ teams }: BlastRadarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-50px' });
  const prefersReduced = useReducedMotion();

  const blockedCount = teams.filter((t) => t.blocked).length;
  const hasBlocked = blockedCount > 0;

  return (
    <div ref={ref} className="relative w-full max-w-[200px] mx-auto aspect-square" aria-hidden>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Concentric rings */}
        {[80, 60, 40, 20].map((r, i) => (
          <motion.circle
            key={i}
            cx={100}
            cy={100}
            r={r}
            fill="none"
            stroke={hasBlocked ? '#fca5a5' : '#e4e4e7'}
            strokeWidth={0.5}
            initial={{ opacity: 0.2 }}
            animate={
              isInView && !prefersReduced && hasBlocked
                ? {
                    opacity: [0.15, 0.4, 0.15],
                    r: [r, r + 2, r],
                  }
                : { opacity: 0.2 }
            }
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Team dots on the radar */}
        {teams.map((team, i) => {
          // Place dots around the circle
          const angle = (i / teams.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 50;
          const cx = 100 + Math.cos(angle) * radius;
          const cy = 100 + Math.sin(angle) * radius;

          return (
            <g key={team.name}>
              {/* Dot */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={6}
                fill={team.blocked ? '#fee2e2' : '#f4f4f5'}
                stroke={team.blocked ? '#ef4444' : '#a1a1aa'}
                strokeWidth={1.5}
                animate={
                  isInView && !prefersReduced && team.blocked
                    ? { r: [6, 8, 6], strokeWidth: [1.5, 2.5, 1.5] }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              {/* Label */}
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fontSize={7}
                fontFamily="monospace"
                fill={team.blocked ? '#ef4444' : '#71717a'}
                fontWeight={team.blocked ? 700 : 500}
              >
                {team.name.length > 12 ? team.name.slice(0, 12) + '…' : team.name}
              </text>
              {/* Status badge */}
              {team.blocked && (
                <text
                  x={cx}
                  y={cy + 22}
                  textAnchor="middle"
                  fontSize={5}
                  fontFamily="monospace"
                  fill="#ef4444"
                  fontWeight={700}
                >
                  BLOCKED
                </text>
              )}
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={100}
          y={98}
          textAnchor="middle"
          fontSize={8}
          fontFamily="monospace"
          fill="#000"
          fontWeight={700}
        >
          BLAST
        </text>
        <text
          x={100}
          y={108}
          textAnchor="middle"
          fontSize={7}
          fontFamily="monospace"
          fill="#71717a"
        >
          RADIUS
        </text>
      </svg>
    </div>
  );
}
