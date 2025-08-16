# Vite + TypeScript + Tailwind CSS + Bun Template

A modern web development template with:
- ⚡ **Vite** - Fast build tool and dev server
- 🔷 **TypeScript** - Type-safe JavaScript
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🚀 **Bun** - Fast JavaScript runtime and package manager

## Getting Started

### Development
```bash
bun run dev
```

### Build
```bash
bun run build
```

### Preview
```bash
bun run preview
```

## Project Structure
```
webapp/
├── src/
│   ├── main.ts          # Entry point
│   ├── counter.ts       # Example component
│   ├── style.css        # Tailwind CSS imports
│   └── vite-env.d.ts    # TypeScript declarations
├── public/
│   └── vite.svg         # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── vite.config.ts       # Vite configuration
```

## Features
- Hot Module Replacement (HMR)
- TypeScript support with strict mode
- Tailwind CSS with PostCSS processing
- Modern ES modules
- Optimized production builds

## Next Steps
1. Start the dev server: `bun run dev`
2. Open http://localhost:5173
3. Edit `src/main.ts` to see HMR in action
4. Customize Tailwind config in `tailwind.config.js`
5. Add your components and styles

## Moving Your Existing Files
To move your existing web app files into this template:
1. Copy your source files to `src/`
2. Copy static assets to `public/`
3. Update imports in your TypeScript files
4. Install any additional dependencies with `bun add <package>`