import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import React from 'react';

/**
 * Utility to conditionally use motion components based on user preferences
 * @param tag - HTML tag to use (default: 'div')
 * @returns motion component or regular element based on reduced motion preference
 */
export function motionMaybe(tag: keyof JSX.IntrinsicElements = 'div') {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? React.createElement.bind(null, tag) : (motion as any)[tag];
}

/**
 * Hook to get motion variants that respect reduced motion preferences
 * @param variants - Animation variants object
 * @returns Empty object if reduced motion, original variants otherwise
 */
export function useMotionVariants(variants: any) {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? {} : variants;
}

/**
 * Component wrapper that conditionally applies motion based on user preferences
 */
interface MotionWrapperProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  variants?: any;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  className?: string;
  [key: string]: any;
}

export function MotionWrapper({ 
  children, 
  as = 'div', 
  variants, 
  initial, 
  animate, 
  exit, 
  transition,
  ...props 
}: MotionWrapperProps) {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return React.createElement(as, props, children);
  }
  
  const MotionComponent = (motion as any)[as];
  return (
    <MotionComponent
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}