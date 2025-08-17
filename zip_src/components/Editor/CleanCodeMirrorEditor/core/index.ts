/**
 * Core module for the Markdown extension system
 * 
 * This file exports all the core components of the extension system.
 */

// Export types
export * from './types';

// Export managers
export { DecorationManager, type SortableDecoration } from './DecorationManager';
export { ExtensionManager } from './ExtensionManager';

// Export base classes
export { BaseExtension } from './BaseExtension';
export { BaseDecorationExtension } from './BaseDecorationExtension';

// Export utilities
export * from './utils';