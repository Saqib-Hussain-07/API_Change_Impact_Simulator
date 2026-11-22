/**
 * TextReveal — word-by-word fade-up on the h1 headline.
 * Renders real h1 text for SEO/screen readers; animation is decorative.
 * Respects prefers-reduced-motion: shows static text immediately.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

interface TextRevealProps {
  text: string;
  className?: string;
}

export function TextReveal({ text, className = '' }: TextRevealProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();

  const words = text.split(' ');

  if (prefersReduced) {
    return <h1 ref={ref} className={className}>{text}</h1>;
  }

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: 0.4,
            delay: i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
          aria-hidden
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}
