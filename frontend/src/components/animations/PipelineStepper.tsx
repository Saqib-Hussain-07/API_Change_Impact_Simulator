/**
 * PipelineStepper — scroll-triggered 6-step pipeline visualization.
 * Steps light up one by one as the section enters the viewport.
 * Static fallback for reduced motion: all steps shown lit.
 */
import { useRef, useState, useEffect } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import {
  Upload,
  GitCompare,
  Tag,
  Users,
  Cpu,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  label: string;
  desc: string;
}

const STEPS: Step[] = [
  { icon: Upload, label: 'Upload Spec', desc: 'OpenAPI JSON/YAML' },
  { icon: GitCompare, label: 'Diff Engine', desc: 'AST comparison' },
  { icon: Tag, label: 'Classify', desc: '16-rule taxonomy' },
  { icon: Users, label: 'Consumer Cross-ref', desc: 'Field-level graph' },
  { icon: Cpu, label: 'Mock Run', desc: 'Prism + Newman' },
  { icon: FileText, label: 'Report', desc: 'Gate decision' },
];

export function PipelineStepper() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const prefersReduced = useReducedMotion();
  const [activeStep, setActiveStep] = useState(prefersReduced ? STEPS.length : 0);

  useEffect(() => {
    if (!isInView || prefersReduced) return;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setActiveStep(step);
      if (step >= STEPS.length) clearInterval(id);
    }, 400);
    return () => clearInterval(id);
  }, [isInView, prefersReduced]);

  return (
    <div ref={ref} className="mt-10 mb-6">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start justify-between gap-2">
        {STEPS.map((step, i) => {
          const isActive = i < activeStep;
          const Icon = step.icon;
          return (
            <div key={i} className="flex-1 flex flex-col items-center text-center relative">
              {/* Connector line */}
              {i > 0 && (
                <motion.div
                  className="absolute top-5 -left-1/2 w-full h-px"
                  style={{ background: isActive ? '#000' : '#e4e4e7', transformOrigin: 'left' }}
                  initial={prefersReduced ? false : { scaleX: 0 }}
                  animate={isActive ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                />
              )}
              {/* Step circle */}
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors z-10 ${
                  isActive
                    ? 'bg-black border-black text-white'
                    : 'bg-white border-zinc-200 text-zinc-400'
                }`}
                initial={prefersReduced ? false : { scale: 0.8, opacity: 0.5 }}
                animate={isActive ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.5 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <Icon className="w-4 h-4 stroke-[2.2]" />
              </motion.div>
              <p className={`text-[11px] font-semibold mt-2 transition-colors ${
                isActive ? 'text-black' : 'text-zinc-400'
              }`}>
                {step.label}
              </p>
              <p className={`text-[10px] mt-0.5 transition-colors ${
                isActive ? 'text-zinc-600' : 'text-zinc-300'
              }`}>
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden space-y-3">
        {STEPS.map((step, i) => {
          const isActive = i < activeStep;
          const Icon = step.icon;
          return (
            <motion.div
              key={i}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                isActive
                  ? 'border-black/20 bg-zinc-50'
                  : 'border-zinc-100 bg-white'
              }`}
              initial={prefersReduced ? false : { opacity: 0, x: -12 }}
              animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'
              }`}>
                <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div>
                <p className={`text-xs font-semibold ${isActive ? 'text-black' : 'text-zinc-400'}`}>
                  {step.label}
                </p>
                <p className={`text-[10px] ${isActive ? 'text-zinc-600' : 'text-zinc-300'}`}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
