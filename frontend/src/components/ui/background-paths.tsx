// background-paths.tsx
// Animated SVG paths hero — monochrome dark/light sweep.
// Fixes:
//   • pathOffset removed (the [0,1,0] linear loop caused a hard-jump flicker)
//   • repeatType:"mirror" gives smooth back-and-forth without any reset jump
//   • useMemo stabilises path data so motion never sees stale references
//   • Deterministic delay/duration via index math — no Math.random() in render
//   • prefers-reduced-motion: static paths, no animation

import React, { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"

const PATH_COUNT = 36

// Builds the cubic-bezier "swoosh" path string for index i, mirrored by position sign
function buildPath(i: number, position: number): string {
  const p = position
  return (
    `M-${380 - i * 5 * p} -${189 + i * 6}` +
    `C-${380 - i * 5 * p} -${189 + i * 6}` +
    ` -${312 - i * 5 * p} ${216 - i * 6}` +
    ` ${152 - i * 5 * p} ${343 - i * 6}` +
    `C${616 - i * 5 * p} ${470 - i * 6}` +
    ` ${684 - i * 5 * p} ${875 - i * 6}` +
    ` ${684 - i * 5 * p} ${875 - i * 6}`
  )
}

function FloatingPaths({
  position,
  reduced,
  dark,
}: {
  position: number
  reduced: boolean
  dark: boolean
}) {
  const paths = useMemo(
    () =>
      Array.from({ length: PATH_COUNT }, (_, i) => ({
        id: i,
        d: buildPath(i, position),
        width: 0.5 + i * 0.03,
        baseOpacity: dark ? 0.07 + i * 0.02 : 0.05 + i * 0.016,
        duration: 16 + ((i * 7) % 11) * 1.6,
        delay: (i * 0.22) % 5,
      })),
    [position, dark],
  )

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <svg
        className={`w-full h-full ${dark ? "text-white" : "text-zinc-900"}`}
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) =>
          reduced ? (
            <path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={path.baseOpacity * 0.55}
            />
          ) : (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              initial={{ pathLength: 1, opacity: 0 }}
              animate={{
                pathLength: [0.3, 1, 0.3],
                opacity: [
                  path.baseOpacity * 0.35,
                  path.baseOpacity * 0.9,
                  path.baseOpacity * 0.35,
                ],
              }}
              transition={{
                duration: path.duration,
                delay: path.delay,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
            />
          ),
        )}
      </svg>
    </div>
  )
}

export function BackgroundPaths({
  children,
  theme = "dark",
}: {
  children: React.ReactNode
  theme?: "dark" | "light"
}) {
  const reduced = useReducedMotion() ?? false
  const dark = theme === "dark"
  const edgeFade = dark ? "rgba(9,9,11,0.65)" : "rgba(255,255,255,0.55)"

  return (
    <div
      className={`relative w-full overflow-hidden ${
        dark ? "bg-[#09090b] text-white" : "bg-white text-black"
      }`}
    >
      <FloatingPaths position={1} reduced={reduced} dark={dark} />
      <FloatingPaths position={-1} reduced={reduced} dark={dark} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${edgeFade} 0%, transparent 18%, transparent 82%, ${edgeFade} 100%)`,
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
