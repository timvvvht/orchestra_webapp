import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionType?: 'fade' | 'dissolve' | 'iris' | 'push' | 'zoom-fade';
}

/**
 * Apple-inspired page transition wrapper
 * 
 * Usage:
 * <PageTransition transitionType="zoom-fade">
 *   <YourComponent />
 * </PageTransition>
 */
export function PageTransition({ 
  children, 
  transitionType = 'zoom-fade' 
}: PageTransitionProps) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    setIsTransitioning(true);
    
    // Store the current children to display during exit animation
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsTransitioning(false);
    }, 250); // Half of the animation duration

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="page-transition-wrapper">
      <div 
        className={`
          ${isTransitioning ? `page-exit-${transitionType}` : `page-enter-${transitionType}`}
        `}
      >
        {displayChildren}
      </div>
    </div>
  );
}

// Export transition class names for manual usage
export const transitionClasses = {
  fade: {
    exit: 'page-exit-fade',
    enter: 'page-enter-fade'
  },
  dissolve: {
    exit: 'page-exit-dissolve', 
    enter: 'page-enter-dissolve'
  },
  iris: {
    exit: 'page-exit-iris',
    enter: 'page-enter-iris'
  },
  push: {
    exit: 'page-exit-push',
    enter: 'page-enter-push'
  },
  'zoom-fade': {
    exit: 'page-exit-zoom-fade',
    enter: 'page-enter-zoom-fade'
  }
};