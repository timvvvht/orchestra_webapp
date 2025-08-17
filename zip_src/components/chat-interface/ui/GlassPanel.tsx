import React, { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

const GlassPanel: React.FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={cn('relative', className)}>
    <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
    <div className="relative bg-white/[0.06] backdrop-blur-2xl rounded-2xl border border-white/10">
      {children}
    </div>
  </div>
);

export default GlassPanel;