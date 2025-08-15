#!/usr/bin/env node

/**
 * Simple import checker for migration
 * Scans TypeScript files for missing imports
 */

const fs = require('fs');
const path = require('path');

function findTSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findTSFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractImports(content) {
  const imports = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') && trimmed.includes('from ')) {
      const match = trimmed.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        imports.push(match[1]);
      }
    }
  }
  
  return imports;
}

function checkFileExists(importPath, currentFile) {
  if (importPath.startsWith('@/')) {
    // Resolve @/ to app/
    const resolved = importPath.replace('@/', 'app/');
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }
    return false;
  }
  
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    // Relative import
    const currentDir = path.dirname(currentFile);
    const resolved = path.resolve(currentDir, importPath);
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }
    return false;
  }
  
  // External package - assume it exists for now
  return true;
}

function main() {
  console.log('🔍 Checking imports in TypeScript files...\n');
  
  const files = findTSFiles('app');
  const missingImports = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const imports = extractImports(content);
      
      for (const imp of imports) {
        if (!checkFileExists(imp, file)) {
          missingImports.push({ file, import: imp });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error reading ${file}:`, error.message);
    }
  }
  
  if (missingImports.length === 0) {
    console.log('✅ All imports resolved!');
  } else {
    console.log(`❌ Found ${missingImports.length} missing imports:\n`);
    
    const grouped = {};
    for (const { file, import: imp } of missingImports) {
      if (!grouped[imp]) {
        grouped[imp] = [];
      }
      grouped[imp].push(file);
    }
    
    for (const [imp, files] of Object.entries(grouped)) {
      console.log(`🎯 Missing: ${imp}`);
      console.log(`   Used in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` (+${files.length - 3} more)` : ''}`);
      console.log('');
    }
  }
}

main();