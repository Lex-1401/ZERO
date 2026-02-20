import fs from 'fs';
const path = '/opt/zero/dist/gateway/server-http.js';
try {
    let content = fs.readFileSync(path, 'utf8');

    // Remove HttpOnly from zero_auth cookie
    const target = '`zero_auth=${token}; Path=/; HttpOnly; SameSite=Strict${securePart}; Max-Age=31536000`,';
    const replacement = '`zero_auth=${token}; Path=/; SameSite=Strict${securePart}; Max-Age=31536000`,';

    if (content.includes('HttpOnly') && content.includes('zero_auth')) {
        content = content.replace(target, replacement);
        fs.writeFileSync(path, content);
        console.log('Removed HttpOnly from zero_auth cookie');
    }
} catch (e) {
    console.error(e);
}
