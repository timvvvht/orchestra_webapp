# RepositoryDropdown Component

A reusable dropdown component for selecting GitHub repositories from a user's connected account.

## Features

- **Automatic Repository Loading**: Uses the `useGitHubRepos` hook to fetch repositories
- **Loading States**: Shows loading spinner while fetching repositories
- **Error Handling**: Displays error messages and GitHub connection requirements
- **GitHub Integration**: Built-in GitHub connection flow
- **Accessibility**: Keyboard navigation and focus management
- **Responsive Design**: Works on all screen sizes
- **Customizable**: Configurable placeholder, styling, and behavior

## Props

| Prop                | Type                       | Default                 | Description                                            |
| ------------------- | -------------------------- | ----------------------- | ------------------------------------------------------ |
| `onRepoSelect`      | `(repo: RepoItem) => void` | **Required**            | Callback function called when a repository is selected |
| `selectedRepo`      | `RepoItem \| null`         | `undefined`             | Currently selected repository                          |
| `placeholder`       | `string`                   | `"Select a repository"` | Placeholder text when no repository is selected        |
| `className`         | `string`                   | `undefined`             | Additional CSS classes for styling                     |
| `disabled`          | `boolean`                  | `false`                 | Whether the dropdown is disabled                       |
| `showConnectButton` | `boolean`                  | `true`                  | Whether to show the GitHub connect button              |

## RepoItem Type

```typescript
interface RepoItem {
  id: number;
  full_name: string;
}
```

## Basic Usage

```tsx
import {
  RepositoryDropdown,
  type RepoItem,
} from "@/components/RepositoryDropdown";

function MyComponent() {
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);

  const handleRepoSelect = (repo: RepoItem) => {
    setSelectedRepo(repo);
    console.log("Selected:", repo.full_name);
  };

  return (
    <RepositoryDropdown
      onRepoSelect={handleRepoSelect}
      selectedRepo={selectedRepo}
      placeholder="Choose a repository"
    />
  );
}
```

## Advanced Usage

```tsx
<RepositoryDropdown
  onRepoSelect={handleRepoSelect}
  selectedRepo={selectedRepo}
  placeholder="Select repository for deployment"
  className="w-80"
  disabled={isProcessing}
  showConnectButton={false}
/>
```

## States

The component automatically handles several states:

1. **Loading**: Shows spinner while fetching repositories
2. **Empty**: Shows message when no repositories are found
3. **Error**: Shows error message and GitHub connection button
4. **Connected**: Shows list of available repositories
5. **Selected**: Highlights the currently selected repository

## Dependencies

- `@/hooks/useGitHubRepos` - For fetching repository data
- `@/utils/cn` - For conditional CSS classes
- `framer-motion` - For smooth animations
- `lucide-react` - For icons

## Styling

The component uses Tailwind CSS classes and can be customized via the `className` prop. It follows the design system with:

- Consistent spacing and typography
- Hover and focus states
- Smooth transitions and animations
- Responsive design patterns

## Accessibility

- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly
- High contrast support
