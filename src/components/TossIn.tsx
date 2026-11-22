"use client";

import { motion, useReducedMotion } from "motion/react";

/** A print tossed onto the page: it drops in a little crooked and settles at its own tilt. Once. */
export function TossIn({ children, className, tilt = 0, index = 0 }: { children: React.ReactNode; className?: string; tilt?: number; index?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} style={{ rotate: `${tilt}deg` }}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 56, rotate: tilt + (index % 2 ? -7 : 7), scale: 1.04 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
