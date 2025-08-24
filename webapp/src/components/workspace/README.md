# WorkspaceDropdown Component

A dropdown menu component that displays GitHub repositories and allows users to select workspaces. Built with the same styling patterns as the existing UI components.

## Features

- **GitHub Repository Integration**: Fetches and displays user's GitHub repositories using `useGitHubRepos` hook
- **Workspace Selection**: Allows selection of repositories/workspaces with visual feedback
- **Consistent UI Styling**: Matches the application's design system with glassmorphic effects
- **Responsive Design**: Adapts to different screen sizes and content
- **Loading States**: Shows loading indicators while fetching repositories
- **Error Handling**: Gracefully handles GitHub connection issues
- **Accessibility**: Keyboard navigation and screen reader support

## Usage

```tsx
import { WorkspaceDropdown } from "@/components/workspace";

function MyComponent() {
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const handleWorkspaceSelect = (workspace) => {
    setSelectedWorkspace(workspace);
    // Handle workspace selection
  };

  return (
    <WorkspaceDropdown
      onWorkspaceSelect={handleWorkspaceSelect}
      selectedWorkspace={selectedWorkspace}
      placeholder="Choose a workspace..."
      className="w-full"
    />
  );
}
```

## Props

| Prop                | Type                               | Default                | Description                               |
| ------------------- | ---------------------------------- | ---------------------- | ----------------------------------------- |
| `onWorkspaceSelect` | `(workspace: any \| null) => void` | **required**           | Callback when a workspace is selected     |
| `selectedWorkspace` | `any \| null`                      | `undefined`            | Currently selected workspace              |
| `placeholder`       | `string`                           | `"Select a workspace"` | Placeholder text when nothing is selected |
| `className`         | `string`                           | `undefined`            | Additional CSS classes                    |
| `disabled`          | `boolean`                          | `false`                | Whether the dropdown is disabled          |
| `showConnectButton` | `boolean`                          | `true`                 | Whether to show GitHub connect button     |

## Styling

The component uses the application's design system with:

- Glassmorphic background effects (`bg-white/[0.03] backdrop-blur-xl`)
- Consistent border styling (`border border-white/10`)
- Hover states with subtle animations
- Focus states with blue accent colors
- Dark theme optimized colors

## Dependencies

- `@/hooks/useGitHubRepos` - For fetching GitHub repositories
- `@/stores/workspaceStore` - For workspace management
- `@/auth/AuthContext` - For user authentication
- `framer-motion` - For smooth animations
- `lucide-react` - For icons

## Examples

See `WorkspaceDropdownDemo.tsx` for a complete usage example.
