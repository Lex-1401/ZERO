import fs from 'node:fs';
import path from 'node:path';

const srcRoot = 'src';
const distRoot = 'dist';

console.log('📦 Copying assets (json, py) from src to dist...');

try {
    const files = fs.readdirSync(srcRoot, { recursive: true }) as string[];

    let count = 0;
    for (const file of files) {
        if (file.endsWith('.py') || file.endsWith('.json')) {
            const srcPath = path.join(srcRoot, file);
            const distPath = path.join(distRoot, file);

            const stat = fs.statSync(srcPath);
            if (stat.isFile()) {
                fs.mkdirSync(path.dirname(distPath), { recursive: true });
                fs.copyFileSync(srcPath, distPath);
                count++;
            }
        }
    }
    console.log(`✅ Copied ${count} assets.`);
} catch (error) {
    console.error('❌ Error copying assets:', error);
    process.exit(1);
}
