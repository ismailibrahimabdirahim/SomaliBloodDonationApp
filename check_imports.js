const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'screens');
const subdirs = ['auth', 'chat', 'main', 'requests'];

subdirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) return;
    
    fs.readdirSync(dirPath).forEach(file => {
        if (!file.endsWith('.tsx')) return;
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, i) => {
            const match = line.match(/from ['"](\.\.?\/[^'"]+)['"]/);
            if (match) {
                const importPath = match[1];
                let resolved = path.resolve(dirPath, importPath);
                
                // Try with .tsx, .ts, .js, /index.tsx, /index.ts
                const possible = [
                    resolved + '.tsx',
                    resolved + '.ts',
                    resolved + '.js',
                    path.join(resolved, 'index.tsx'),
                    path.join(resolved, 'index.ts')
                ];
                
                if (!possible.some(p => fs.existsSync(p))) {
                    console.log(`BROKEN IMPORT: ${dir}/${file}:${i+1} -> ${importPath} (Resolved: ${resolved})`);
                }
            }
        });
    });
});
