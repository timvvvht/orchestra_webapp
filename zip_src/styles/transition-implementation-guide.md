# CSS-Only Page Transition Implementation Guide

## Quick Start (Recommended Approach)

### 1. Import the CSS file in your main stylesheet or component:
```css
@import './page-transitions.css';
```

### 2. Apply classes to your page containers:

#### For LandingPagePrelude → Chat transition:
```html
<!-- When leaving the prelude -->
<div class="page-transition-wrapper page-exit-zoom-fade">
  <LandingPagePrelude />
</div>

<!-- When entering chat -->
<div class="page-transition-wrapper page-enter-zoom-fade">
  <ChatMain />
</div>
```

### 3. Simple CSS-only implementation in your components:

```css
/* In your component's CSS */
.landing-prelude-container {
  animation: enterZoomFade 0.5s cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

.landing-prelude-container.exiting {
  animation: exitZoomFade 0.5s cubic-bezier(0.32, 0, 0.67, 0) forwards;
}
```

## Available Transitions

### 1. **Zoom Fade** (Recommended - Modern Apple style)
- Subtle scale + blur + fade
- Best for major navigation changes
- Classes: `page-exit-zoom-fade`, `page-enter-zoom-fade`

### 2. **Fade Through Black** (iOS app style)
- Dims to black then brightens
- Good for mode switches
- Classes: `page-exit-fade`, `page-enter-fade`

### 3. **Dissolve** (macOS window style)
- Simple opacity + slight scale
- Good for overlays/modals
- Classes: `page-exit-dissolve`, `page-enter-dissolve`

### 4. **Iris** (Classic Mac, modernized)
- Circular reveal/hide
- Good for focused actions
- Classes: `page-exit-iris`, `page-enter-iris`

### 5. **Push** (iOS navigation)
- Slide + fade
- Good for hierarchical navigation
- Classes: `page-exit-push`, `page-enter-push`

## Integration Examples

### Example 1: Router-based transitions
```jsx
// In your route components
<div className={`page-transition-wrapper ${isNavigating ? 'page-exit-zoom-fade' : 'page-enter-zoom-fade'}`}>
  {children}
</div>
```

### Example 2: Conditional rendering
```jsx
{showPrelude ? (
  <div className="page-enter-zoom-fade">
    <LandingPagePrelude />
  </div>
) : (
  <div className="page-enter-zoom-fade">
    <LandingPageInfinite />
  </div>
)}
```

### Example 3: Pure CSS with :target
```css
#prelude:target {
  animation: enterZoomFade 0.5s cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

#prelude:not(:target) {
  animation: exitZoomFade 0.5s cubic-bezier(0.32, 0, 0.67, 0) forwards;
}
```

## Best Practices

1. **Preserve Background**: Keep gradient backgrounds persistent
```jsx
<div className="transition-background-persist">
  {/* Your gradient background */}
</div>
```

2. **Stagger Elements**: Use delay classes for sequential animations
```jsx
<h1 className="page-enter-zoom-fade transition-delay-1">Title</h1>
<p className="page-enter-zoom-fade transition-delay-2">Subtitle</p>
```

3. **Accessibility**: Transitions automatically reduce for users who prefer reduced motion

4. **Performance**: All animations use GPU-accelerated properties (transform, opacity, filter)

## Timing Guidelines

- **Navigation**: 0.4-0.5s (zoom-fade, dissolve)
- **Mode switches**: 0.5-0.6s (fade through black)
- **Overlays**: 0.3-0.4s (dissolve)
- **Focus changes**: 0.6-0.7s (iris)

## Custom Timing Functions

Apple-inspired bezier curves used:
- **Ease out**: `cubic-bezier(0.32, 0, 0.67, 0)`
- **Ease in**: `cubic-bezier(0.33, 1, 0.68, 1)`
- **Smooth**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Snappy**: `cubic-bezier(0.65, 0, 0.35, 1)`