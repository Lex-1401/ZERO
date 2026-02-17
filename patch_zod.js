import fs from 'fs';
const path = '/opt/zero/dist/config/zod-schema.js';
try {
    let content = fs.readFileSync(path, 'utf8');

    let modified = false;

    // Patch cors
    if (!content.includes('cors: z.any().optional()')) {
        const target = 'nodes: z';
        if (content.includes(target)) {
            content = content.replace(target, 'cors: z.any().optional(), nodes: z');
            modified = true;
        }
    }

    // Patch controlUi
    if (!content.includes('controlUi: z.any().optional()')) {
        const target = 'auth: z';
        if (content.includes(target)) {
            content = content.replace(target, 'controlUi: z.any().optional(), auth: z');
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(path, content);
        console.log('Patched zod-schema.js with cors and controlUi successfully');
    } else {
        console.log('Already patched or targets not found');
    }
} catch (e) {
    console.error(e);
    process.exit(1);
}
