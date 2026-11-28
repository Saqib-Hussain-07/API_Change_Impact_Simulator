// Login 3 from Hirael <https://hirael.com/blocks/auth/login-03>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael
// Dark editorial monochrome theme matching Hirael Login03 with non-flickering
// FloatingPaths, motion/react entrance, and real email/password + demo persona auth.

"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Terminal,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DemoPersona = "admin" | "mobile" | "analytics";

export interface Login03Props {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  role: "admin" | "consumer_rep";
  onRoleChange: (role: "admin" | "consumer_rep") => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onPickPersona: (persona: DemoPersona) => void;
}

const PATH_COUNT = 36;

function buildPath(i: number, position: number): string {
  const p = position;
  return (
    `M-${380 - i * 5 * p} -${189 + i * 6}` +
    `C-${380 - i * 5 * p} -${189 + i * 6}` +
    ` -${312 - i * 5 * p} ${216 - i * 6}` +
    ` ${152 - i * 5 * p} ${343 - i * 6}` +
    `C${616 - i * 5 * p} ${470 - i * 6}` +
    ` ${684 - i * 5 * p} ${875 - i * 6}` +
    ` ${684 - i * 5 * p} ${875 - i * 6}`
  );
}

const FloatingPaths = ({ position }: { position: number }) => {
  const reduceMotion = useReducedMotion() ?? false;
  const paths = React.useMemo(
    () =>
      Array.from({ length: PATH_COUNT }, (_, i) => ({
        id: i,
        d: buildPath(i, position),
        width: 0.5 + i * 0.03,
        baseOpacity: 0.08 + i * 0.018,
        duration: 16 + ((i * 7) % 11) * 1.6,
        delay: (i * 0.22) % 5,
      })),
    [position],
  );

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg
        className="h-full w-full text-white"
        fill="none"
        viewBox="0 0 696 316"
      >
        {paths.map((path) =>
          reduceMotion ? (
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
                  path.baseOpacity * 0.85,
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
  );
};

function enterMotion(index: number, reduceMotion: boolean) {
  if (reduceMotion) return {};
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.5,
      delay: index * 0.06,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };
}

const Login03 = ({
  mode,
  onModeChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  role,
  onRoleChange,
  loading,
  onSubmit,
  onPickPersona,
}: Login03Props) => {
  const [showPw, setShowPw] = React.useState(false);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      data-slot="login"
      className="relative min-h-svh overflow-hidden bg-[#09090b] text-[#fafafa] lg:grid lg:grid-cols-2"
    >
      {/* Left Split Panel */}
      <aside
        data-slot="login-aside"
        className="relative hidden h-full flex-col overflow-hidden border-e border-zinc-800/80 bg-[#111113] p-10 lg:flex"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, transparent, transparent, #09090b)",
          }}
        />

        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <motion.div
          {...enterMotion(0, reduceMotion)}
          className="relative z-10 flex items-center gap-2.5"
        >
          <div className="flex size-6 items-center justify-center rounded bg-white text-black">
            <Terminal className="size-3.5 stroke-[2.5]" />
          </div>
          <span className="text-base font-semibold tracking-[-0.025em] text-white">
            API Impact
          </span>
        </motion.div>

        <motion.figure
          {...enterMotion(4, reduceMotion)}
          className="relative z-10 mt-auto flex flex-col gap-3"
        >
          <blockquote className="font-serif text-2xl leading-[1.25] tracking-tight text-zinc-200 md:text-3xl">
            We caught every breaking schema drift and{" "}
            <span className="italic text-white">never looked back</span>. Ephemeral
            Prism mocks and Newman gates run before merge.
          </blockquote>
          <figcaption className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
            <span>Platform team</span>
            <span aria-hidden="true" className="text-zinc-700">
              |
            </span>
            <span>API Impact</span>
          </figcaption>
        </motion.figure>
      </aside>

      {/* Right Main Panel */}
      <div
        data-slot="login-main"
        className="relative flex min-h-svh flex-col justify-center bg-[#09090b] px-8 py-16 lg:min-h-0"
      >
        {/* Subtle monochrome radial spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-60"
        >
          <div
            className="absolute end-0 top-0 h-[520px] w-[420px] -translate-y-1/4 rounded-full"
            style={{
              background:
                "radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(255, 255, 255, 0.05) 0, rgba(255, 255, 255, 0.015) 50%, rgba(255, 255, 255, 0.005) 80%)",
            }}
          />
        </div>

        <motion.div
          {...enterMotion(0, reduceMotion)}
          className="absolute start-5 top-7 z-10"
        >
          <Button
            asChild
            variant="ghost"
            className="gap-1.5 text-zinc-300 hover:bg-zinc-900 hover:text-white"
          >
            <Link to="/">
              <ChevronLeft className="size-4 rtl:rotate-180" />
              Home
            </Link>
          </Button>
        </motion.div>

        <div
          data-slot="login-panel"
          className="relative z-10 mx-auto w-full space-y-6 sm:max-w-sm"
        >
          {/* Mobile brand header */}
          <motion.div
            {...enterMotion(0, reduceMotion)}
            className="flex items-center gap-2 lg:hidden"
          >
            <div className="flex size-6 items-center justify-center rounded bg-white text-black">
              <Terminal className="size-3.5 stroke-[2.5]" />
            </div>
            <span className="text-base font-semibold tracking-[-0.025em] text-white">
              API Impact
            </span>
          </motion.div>

          {/* Editorial Serif Header */}
          <div data-slot="login-header" className="flex flex-col gap-2">
            <motion.h1
              {...enterMotion(1, reduceMotion)}
              className="font-serif text-4xl font-medium tracking-tight text-white sm:text-5xl"
            >
              {mode === "signin" ? "Sign in or join." : "Create account."}
            </motion.h1>
            <motion.p
              {...enterMotion(2, reduceMotion)}
              className="text-sm text-zinc-400"
            >
              {mode === "signin"
                ? "Pick a demo persona or sign in with your workspace credentials."
                : "Register a workspace member for OpenAPI diffing and contract gates."}
            </motion.p>
          </div>

          {/* Credentials Form */}
          <motion.form
            {...enterMotion(3, reduceMotion)}
            onSubmit={onSubmit}
            className="space-y-3.5"
          >
            {mode === "signin" && (
              <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                <span className="mr-1 text-[11px] text-zinc-500">Demo:</span>
                {(
                  [
                    { id: "admin", label: "Admin", match: "admin@acme.dev" },
                    { id: "mobile", label: "Mobile Rep", match: "mobile-rep@acme.dev" },
                    { id: "analytics", label: "Analytics", match: "analytics-rep@acme.dev" },
                  ] as const
                ).map((p) => {
                  const active = email === p.match;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPickPersona(p.id)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        active
                          ? "border-zinc-400 bg-zinc-800 text-white"
                          : "border-zinc-800 bg-[#111113] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="sr-only">
                Work Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                className="h-10 w-full rounded-md border border-zinc-800 bg-[#111113] px-3 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="developer@acme.dev"
              />
            </div>

            <div className="relative">
              <label htmlFor="auth-password" className="sr-only">
                Password
              </label>
              <input
                id="auth-password"
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                className="h-10 w-full rounded-md border border-zinc-800 bg-[#111113] px-3 pr-9 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPw((prev) => !prev)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                {showPw ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="auth-role" className="sr-only">
                  Workspace Role
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) =>
                    onRoleChange(e.target.value as "admin" | "consumer_rep")
                  }
                  className="h-10 w-full rounded-md border border-zinc-800 bg-[#111113] px-3 font-mono text-xs text-white focus:border-zinc-500 focus:outline-none"
                >
                  <option value="consumer_rep">Consumer Representative</option>
                  <option value="admin">API Owner (Admin)</option>
                </select>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full gap-2 bg-white text-black hover:bg-zinc-200"
            >
              {loading && (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              )}
              {loading
                ? mode === "signin"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "signin"
                  ? "Continue to Console"
                  : "Create Account"}
            </Button>
            <span role="status" className="sr-only">
              {loading ? "Submitting authentication request" : ""}
            </span>
          </motion.form>

          <motion.p
            {...enterMotion(4, reduceMotion)}
            className="text-xs text-zinc-500"
          >
            {mode === "signin" ? "New to API Impact? " : "Already have access? "}
            <button
              type="button"
              onClick={() =>
                onModeChange(mode === "signin" ? "signup" : "signin")
              }
              className="text-zinc-200 underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
            {" · "}Protected by JWT &amp; RBAC.
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default Login03;
