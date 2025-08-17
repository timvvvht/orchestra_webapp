import React, { useState } from 'react';
// import CleanCodeMirrorEditor from '@/components/Editor/CleanCodeMirrorEditor'; // Removed - migrated to Tiptap
import TiptapEditor from '@/components/Editor/TiptapEditor';
import { useTheme } from '@/components/theme/theme-provider';

const TEST_CONTENT = `# Code Block Test

Let's test various code block scenarios to ensure they're styled properly with Tokyo Night.

## Single Line Code Block

\`\`\`
console.log("Hello, World!");
\`\`\`

## Multi-line Code Block with Language

\`\`\`javascript
// This is a multi-line code block
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return {
    message: \`Welcome to Orchestra\`,
    timestamp: new Date().toISOString()
  };
}

// Call the function
const result = greet("Developer");
console.log(result);
\`\`\`

## Python Example

\`\`\`python
def fibonacci(n):
    """Generate Fibonacci sequence up to n"""
    a, b = 0, 1
    while a < n:
        print(a, end=' ')
        a, b = b, a + b
    print()

# Test the function
fibonacci(100)
\`\`\`

## TypeScript with Types

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

class UserService {
  private users: Map<string, User> = new Map();

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }
}
\`\`\`

## Empty Code Block

\`\`\`
\`\`\`

## Code Block without Language

\`\`\`
This is a code block without a specified language.
It should still be styled properly.
Multiple lines work fine.
\`\`\`

## Inline Code

Don't forget that \`inline code\` should also be styled nicely with a subtle background.

## Testing Copy Button

Try hovering over the code blocks above. You should see:
1. A copy button in the top-right corner
2. A language indicator (for blocks with language specified)
3. Proper background colors and borders
4. Rounded corners on the code block container

The copy button should work with a single click!`;

export function TestCodeBlocks() {
  const [content, setContent] = useState(TEST_CONTENT);
  const { theme } = useTheme();

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-semibold">Code Block Test - Tokyo Night</h1>
        <p className="text-sm text-muted-foreground">
          Testing code block styling and copy functionality • {theme} mode
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <TiptapEditor
          content={content}
          onChange={setContent}
          onSave={() => Promise.resolve(true)}
          filePath={null}
          isLoading={false}
        />
      </div>
    </div>
  );
}

export default TestCodeBlocks;