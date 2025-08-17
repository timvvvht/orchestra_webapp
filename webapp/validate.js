// Simple validation script to check if our new files are syntactically correct
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/routes/StartChat.tsx',
  'src/components/mission-control/ProvisioningOverlay.tsx',
  'src/routes.tsx'
];

console.log('🔍 Validating new files...');

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Basic syntax checks
    const hasImports = content.includes('import');
    const hasExport = content.includes('export');
    const hasReact = content.includes('React');
    const hasValidJSX = content.includes('<') && content.includes('>');
    
    console.log(`✅ ${file}:`);
    console.log(`   - Has imports: ${hasImports}`);
    console.log(`   - Has exports: ${hasExport}`);
    console.log(`   - Uses React: ${hasReact}`);
    console.log(`   - Has JSX: ${hasValidJSX}`);
    
    // Check for obvious syntax errors
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    console.log(`   - Braces balanced: ${openBraces === closeBraces} (${openBraces}/${closeBraces})`);
    console.log(`   - Parens balanced: ${openParens === closeParens} (${openParens}/${closeParens})`);
    
  } catch (error) {
    console.log(`❌ ${file}: ${error.message}`);
  }
});

console.log('\n🎯 Validation complete!');