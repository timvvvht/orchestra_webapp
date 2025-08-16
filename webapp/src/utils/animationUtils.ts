/**
 * Utility functions for smooth animations using the FLIP technique
 * (First, Last, Invert, Play)
 */

/**
 * Measures the initial position and dimensions of an element
 */
export function measureElement(element: HTMLElement) {
  return element.getBoundingClientRect();
}

/**
 * Calculates the transform needed to move from the first position to the last position
 */
export function calculateTransform(first: DOMRect, last: DOMRect) {
  const deltaX = first.left - last.left;
  const deltaY = first.top - last.top;
  const deltaWidth = first.width / last.width;
  const deltaHeight = first.height / last.height;
  
  return {
    transform: `translate(${deltaX}px, ${deltaY}px) scale(${deltaWidth}, ${deltaHeight})`,
    transformOrigin: 'top left',
  };
}

/**
 * Applies a transform to an element
 */
export function applyTransform(element: HTMLElement, transform: string, origin: string = 'top left') {
  element.style.transformOrigin = origin;
  element.style.transform = transform;
}

/**
 * Plays an animation to smoothly transition an element
 */
export function playAnimation(element: HTMLElement, duration: number = 300, easing: string = 'cubic-bezier(0.2, 0, 0, 1)') {
  return new Promise<void>((resolve) => {
    // Force a reflow to ensure the transform is applied before transitioning
    void element.offsetWidth;
    
    // Apply the transition
    element.style.transition = `transform ${duration}ms ${easing}`;
    element.style.transform = 'none';
    
    // Clean up after the animation completes
    const onTransitionEnd = () => {
      element.style.transition = '';
      element.style.transformOrigin = '';
      element.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    
    element.addEventListener('transitionend', onTransitionEnd);
    
    // Fallback in case the transitionend event doesn't fire
    setTimeout(onTransitionEnd, duration + 50);
  });
}

/**
 * Performs a complete FLIP animation
 * 
 * @param element The element to animate
 * @param getLastRect Function that returns the final position
 * @param duration Animation duration in milliseconds
 * @param easing CSS easing function
 */
export async function flipAnimation(
  element: HTMLElement,
  getLastRect: () => DOMRect,
  duration: number = 300,
  easing: string = 'cubic-bezier(0.2, 0, 0, 1)'
) {
  // First: measure the element in its initial position
  const firstRect = measureElement(element);
  
  // Last: get the final position
  const lastRect = getLastRect();
  
  // Invert: calculate and apply the transform
  const { transform, transformOrigin } = calculateTransform(firstRect, lastRect);
  applyTransform(element, transform, transformOrigin);
  
  // Play: animate to the final position
  await playAnimation(element, duration, easing);
}

/**
 * Creates a physics-based spring animation
 * 
 * @param callback Function to call on each animation frame
 * @param config Spring configuration
 */
export function springAnimation(
  callback: (value: number) => void,
  {
    from = 0,
    to = 1,
    stiffness = 170,
    damping = 26,
    mass = 1,
    velocity = 0,
    precision = 0.01,
  } = {}
) {
  let position = from;
  let currentVelocity = velocity;
  let animationFrameId: number | null = null;
  
  const step = () => {
    // Calculate spring force using Hooke's law: F = -kx
    // where k is the spring stiffness and x is the displacement from rest position
    const displacement = position - to;
    const springForce = -stiffness * displacement;
    
    // Calculate damping force: F = -cv
    // where c is the damping coefficient and v is the velocity
    const dampingForce = -damping * currentVelocity;
    
    // Calculate acceleration: a = F/m
    const acceleration = (springForce + dampingForce) / mass;
    
    // Update velocity: v = v + a * dt
    // Using a fixed time step for simplicity
    const dt = 1 / 60; // Assuming 60fps
    currentVelocity += acceleration * dt;
    
    // Update position: x = x + v * dt
    position += currentVelocity * dt;
    
    // Call the callback with the current position
    callback(position);
    
    // Check if the animation has settled
    if (
      Math.abs(currentVelocity) < precision &&
      Math.abs(displacement) < precision
    ) {
      // Animation has settled, call the callback one last time with the exact target value
      callback(to);
      return;
    }
    
    // Continue the animation
    animationFrameId = requestAnimationFrame(step);
  };
  
  // Start the animation
  animationFrameId = requestAnimationFrame(step);
  
  // Return a function to cancel the animation
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}