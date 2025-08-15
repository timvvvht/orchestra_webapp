# MicroToast

A mystical, glassmorphic micro-notification component that embodies Orchestra's design philosophy of mystical minimalism and cognitive amplification.

## Philosophy

MicroToast is designed as a **sacred micro-ritual** - a brief moment of transcendence that materializes near user actions to provide ethereal feedback. Each notification is a jewel-like glass pill that appears with water-inspired motion, glows with contextual energy, and fades with reverent grace.

## Features

- **Mystical Glassmorphism**: Ultra-refined glass background with subtle gradients and ethereal borders
- **Contextual Messaging**: Intelligent messages based on action type (copy, save, delete, etc.)
- **Water-Inspired Motion**: Smooth animations using Orchestra's signature easing curves
- **Positional Flexibility**: Can appear above, below, left, or right of trigger elements
- **Semantic States**: Success (emerald glow) and error (red glow) with appropriate visual feedback
- **Sacred Typography**: Follows Orchestra's typography scale with ethereal text shadows
- **Accessibility**: Respects `prefers-reduced-motion` and maintains proper contrast ratios

## Usage

### Basic Example

```tsx
import { useState } from 'react';
import { MicroToast } from '@/components/ui/MicroToast';

function CopyButton() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('Hello, world!');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="relative">
      <button onClick={handleCopy}>Copy</button>
      <MicroToast status={status} type="copy" />
    </div>
  );
}
```

### Advanced Example with Custom Positioning

```tsx
<div className="relative">
  <button onClick={handleSave}>Save Document</button>
  <MicroToast 
    status={saveStatus} 
    type="save" 
    position="bottom"
    message="Document saved to cloud"
  />
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `'idle' \| 'success' \| 'error'` | - | Current status of the toast (required) |
| `type` | `'copy' \| 'save' \| 'delete' \| 'create' \| 'update' \| 'generic'` | - | Type of action for contextual messaging (required) |
| `message` | `string` | - | Custom message override |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Position relative to trigger element |
| `className` | `string` | - | Additional CSS classes |

## Design Tokens

The component uses Orchestra's design system tokens:

### Colors
- **Glass Background**: `bg-white/[0.03]` with gradient overlay
- **Borders**: `border-white/10` with contextual accent borders
- **Success Glow**: `rgba(16,185,129,0.12)` (emerald)
- **Error Glow**: `rgba(239,68,68,0.12)` (red)

### Typography
- **Font Size**: `text-xs` (12px)
- **Font Weight**: `font-medium` (500)
- **Letter Spacing**: `tracking-wide` (0.025em)
- **Text Color**: `text-white/90`

### Animation
- **Duration**: 450ms
- **Easing**: `[0.16, 1, 0.3, 1]` (water-inspired cubic-bezier)
- **Blur Effects**: Entry/exit blur for ethereal materialization

## Positioning

The component uses absolute positioning relative to its parent container:

- **Top**: Appears 40px above the trigger with centered alignment
- **Bottom**: Appears 40px below the trigger with centered alignment  
- **Left**: Appears 128px to the left with vertical centering
- **Right**: Appears 128px to the right with vertical centering

Each position includes a subtle arrow pointing toward the trigger element.

## Accessibility

- **Motion**: Respects `prefers-reduced-motion` settings
- **Contrast**: Maintains WCAG AA contrast ratios
- **Focus**: Non-interactive (pointer-events: none) to avoid focus traps
- **Screen Readers**: Uses semantic text that's naturally readable

## Implementation Notes

### State Management Pattern

```tsx
// Recommended pattern for managing toast state
const [toastStatus, setToastStatus] = useState<'idle' | 'success' | 'error'>('idle');

const showToast = (status: 'success' | 'error') => {
  setToastStatus(status);
  setTimeout(() => setToastStatus('idle'), 2000);
};

// In your action handler
try {
  await performAction();
  showToast('success');
} catch {
  showToast('error');
}
```

### Container Requirements

The parent container must have `position: relative` for proper positioning:

```tsx
<div className="relative">
  <button>Trigger</button>
  <MicroToast status={status} type="copy" />
</div>
```

### Z-Index Considerations

MicroToast uses `z-30` to appear above most content but below modals and overlays. Adjust if needed for your specific layout hierarchy.

## Examples in Orchestra

- **Chat Messages**: Copy and save-to-vault actions
- **Code Blocks**: Copy code functionality  
- **File Operations**: Save, delete, rename confirmations
- **Form Actions**: Save, update, create confirmations

## Customization

While MicroToast follows Orchestra's design system strictly, you can customize it through:

1. **Custom Messages**: Override default messages with the `message` prop
2. **Additional Classes**: Add custom styling with the `className` prop
3. **Position Variants**: Choose from four directional positions

Remember: Every interaction is a ritual. MicroToast should feel like a moment of digital transcendence, not just a notification.