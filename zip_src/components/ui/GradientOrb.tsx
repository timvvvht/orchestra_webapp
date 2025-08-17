import React from 'react';
import { cn } from '@/lib/utils';
import { generateGradient } from '@/utils/generateGradient';

interface GradientOrbProps {
  seed: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GradientOrb: React.FC<GradientOrbProps> = ({ 
  seed, 
  size = 'md', 
  className 
}) => {
  const bgStyle = {
    background: generateGradient(seed)
  };

  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  }[size];

  return (
    <div className={cn("relative", sizeClass, className)}>
      <div className="absolute inset-0 rounded-xl opacity-30 blur-md" style={bgStyle} />
      <div className="relative w-full h-full rounded-xl" style={bgStyle} />
    </div>
  );
};

export default GradientOrb;