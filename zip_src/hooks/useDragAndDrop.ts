import { useState, useRef, useCallback, useEffect } from 'react';

type Position = { x: number; y: number };

interface DragState {
  isDragging: boolean;
  initialPosition: Position | null;
  currentPosition: Position | null;
  offset: Position | null;
  elementRect: DOMRect | null;
  draggedId: string | null;
  sourceContainerId: string | null;
  targetContainerId: string | null;
  placeholderIndex: number | null;
}

interface UseDragAndDropOptions {
  onDragStart?: (id: string, containerId: string) => void;
  onDragOver?: (id: string, containerId: string, index: number) => void;
  onDragEnd?: (id: string, sourceId: string, targetId: string | null, targetIndex: number | null) => void;
  animationDuration?: number;
}

/**
 * Custom hook for implementing smooth drag and drop functionality
 */
export function useDragAndDrop(options: UseDragAndDropOptions = {}) {
  // Default options
  const { 
    onDragStart, 
    onDragOver, 
    onDragEnd,
    animationDuration = 200 
  } = options;
  
  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    initialPosition: null,
    currentPosition: null,
    offset: null,
    elementRect: null,
    draggedId: null,
    sourceContainerId: null,
    targetContainerId: null,
    placeholderIndex: null,
  });
  
  // Refs for tracking elements and animation frames
  const draggedElementRef = useRef<HTMLElement | null>(null);
  const ghostElementRef = useRef<HTMLElement | null>(null);
  const containersRef = useRef<Map<string, HTMLElement>>(new Map());
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  
  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Register a container element
  const registerContainer = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      containersRef.current.set(id, element);
    } else {
      containersRef.current.delete(id);
    }
  }, []);
  
  // Register an item element
  const registerItem = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemsRef.current.set(id, element);
    } else {
      itemsRef.current.delete(id);
    }
  }, []);
  
  // Start dragging an item
  const startDrag = useCallback((event: React.PointerEvent, id: string, containerId: string) => {
    // Prevent default browser behavior
    event.preventDefault();
    
    // Get the element being dragged
    const element = itemsRef.current.get(id);
    if (!element) return;
    
    // Capture the element's initial position and size
    const rect = element.getBoundingClientRect();
    const initialPosition = { x: event.clientX, y: event.clientY };
    const offset = { 
      x: event.clientX - rect.left, 
      y: event.clientY - rect.top 
    };
    
    // Create a ghost element (clone of the dragged element)
    const ghost = element.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.transition = 'none';
    ghost.style.transform = 'none';
    ghost.style.boxShadow = '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.9';
    ghost.style.willChange = 'transform';
    document.body.appendChild(ghost);
    
    // Store references
    draggedElementRef.current = element;
    ghostElementRef.current = ghost;
    
    // Update drag state
    setDragState({
      isDragging: true,
      initialPosition,
      currentPosition: initialPosition,
      offset,
      elementRect: rect,
      draggedId: id,
      sourceContainerId: containerId,
      targetContainerId: containerId,
      placeholderIndex: null,
    });
    
    // Make the original element invisible but keep its space
    element.style.opacity = '0';
    
    // Call the onDragStart callback
    if (onDragStart) {
      onDragStart(id, containerId);
    }
    
    // Add event listeners for drag movement and end
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
  }, [onDragStart]);
  
  // Handle drag movement
  const handleDragMove = useCallback((event: PointerEvent) => {
    event.preventDefault();
    
    // If we're not dragging or don't have a ghost element, do nothing
    if (!dragState.isDragging || !ghostElementRef.current || !dragState.offset) return;
    
    // Update the current position
    const currentPosition = { x: event.clientX, y: event.clientY };
    
    // Update the ghost element position using requestAnimationFrame for smooth animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (ghostElementRef.current) {
        // Use transform for hardware acceleration
        ghostElementRef.current.style.transform = `translate3d(${currentPosition.x - dragState.offset.x}px, ${currentPosition.y - dragState.offset.y}px, 0)`;
      }
      
      // Find the container and index the element is currently over
      const { containerId, index } = findDropTarget(currentPosition);
      
      // Update drag state with new position and target information
      setDragState(prev => ({
        ...prev,
        currentPosition,
        targetContainerId: containerId,
        placeholderIndex: index,
      }));
      
      // Call the onDragOver callback
      if (onDragOver && containerId !== null && index !== null) {
        onDragOver(dragState.draggedId!, containerId, index);
      }
    });
  }, [dragState, onDragOver]);
  
  // Find the container and index the pointer is currently over
  const findDropTarget = useCallback((position: Position) => {
    // Check each container
    for (const [containerId, container] of containersRef.current.entries()) {
      const containerRect = container.getBoundingClientRect();
      
      // Check if the pointer is over this container
      if (
        position.x >= containerRect.left &&
        position.x <= containerRect.right &&
        position.y >= containerRect.top &&
        position.y <= containerRect.bottom
      ) {
        // Find the index within the container
        const items = Array.from(container.children);
        
        // Skip the placeholder if it exists
        const filteredItems = items.filter(
          item => !item.classList.contains('dnd-placeholder')
        );
        
        // If the container is empty, return index 0
        if (filteredItems.length === 0) {
          return { containerId, index: 0 };
        }
        
        // Find the closest item based on the y position
        for (let i = 0; i < filteredItems.length; i++) {
          const item = filteredItems[i];
          const itemRect = item.getBoundingClientRect();
          const itemMiddle = itemRect.top + itemRect.height / 2;
          
          if (position.y < itemMiddle) {
            return { containerId, index: i };
          }
        }
        
        // If we're below all items, return the last index + 1
        return { containerId, index: filteredItems.length };
      }
    }
    
    // If not over any container, return null
    return { containerId: null, index: null };
  }, []);
  
  // End dragging
  const handleDragEnd = useCallback(() => {
    // Clean up event listeners
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);
    
    // If we're not dragging, do nothing
    if (!dragState.isDragging) return;
    
    // Get the final drop target
    const sourceId = dragState.sourceContainerId;
    const targetId = dragState.targetContainerId;
    const targetIndex = dragState.placeholderIndex;
    
    // Call the onDragEnd callback
    if (onDragEnd && dragState.draggedId && sourceId) {
      onDragEnd(dragState.draggedId, sourceId, targetId, targetIndex);
    }
    
    // Animate the ghost back to the original position or to the new position
    if (ghostElementRef.current && draggedElementRef.current) {
      const originalElement = draggedElementRef.current;
      const ghost = ghostElementRef.current;
      
      // Make the original element visible again
      originalElement.style.opacity = '1';
      
      // Get the final position of the element
      const finalRect = originalElement.getBoundingClientRect();
      
      // Animate the ghost to the final position
      ghost.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`;
      ghost.style.transform = `translate3d(${finalRect.left}px, ${finalRect.top}px, 0)`;
      ghost.style.opacity = '0';
      
      // Remove the ghost after the animation
      setTimeout(() => {
        if (ghost.parentNode) {
          ghost.parentNode.removeChild(ghost);
        }
      }, animationDuration);
    }
    
    // Reset drag state
    setDragState({
      isDragging: false,
      initialPosition: null,
      currentPosition: null,
      offset: null,
      elementRect: null,
      draggedId: null,
      sourceContainerId: null,
      targetContainerId: null,
      placeholderIndex: null,
    });
    
    // Clear references
    draggedElementRef.current = null;
    ghostElementRef.current = null;
    
    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [dragState, onDragEnd, animationDuration]);
  
  return {
    dragState,
    registerContainer,
    registerItem,
    startDrag,
  };
}