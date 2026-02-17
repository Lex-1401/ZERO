import fs from 'fs';
const path = '/opt/zero/dist/gateway/auth.js';
try {
    let content = fs.readFileSync(path, 'utf8');

    // Disable isBlocked check (already done in previous patch but let's be sure)
    const blockedTarget = 'if (clientIp && authProtector.isBlocked(clientIp)) {';
    if (content.includes(blockedTarget)) {
        content = content.replace(blockedTarget, 'if (false && clientIp && authProtector.isBlocked(clientIp)) {');
    }

    // Disable recordFailure
    content = content.replace('await authProtector.recordFailure(clientIp);', '// await authProtector.recordFailure(clientIp);');

    // Add cookie extraction logic
    const tokenTarget = 'const token = connectAuth?.token;';
    const cookieLogic = `    let token = connectAuth?.token;
    if (!token && req) {
        const cookie = req.headers.cookie;
        if (cookie) {
            const match = cookie.match(/(?:^|; )zero_auth=([^;]*)/i);
            if (match) token = match[1].trim();
        }
    }`;

    if (!content.includes('req.headers.cookie')) {
        content = content.replace(tokenTarget, cookieLogic);
    }

    fs.writeFileSync(path, content);
    console.log('Patched auth.js to disable brute force and support cookies');
} catch (e) {
    console.error(e);
    process.exit(1);
}
