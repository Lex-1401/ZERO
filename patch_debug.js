import fs from 'fs';
const path = '/opt/zero/dist/gateway/server-http.js';
try {
    let content = fs.readFileSync(path, 'utf8');

    // Log auth state
    const target = 'const authResult = await authorizeGatewayConnect({';
    const log = 'console.log("[debug-http-auth]", { token: (token || "").slice(0,3) + "...", authMode: resolvedAuth.mode, hasTokenInConfig: !!resolvedAuth.token });';

    if (!content.includes('[debug-http-auth]')) {
        content = content.replace(target, log + '\n        ' + target);
        fs.writeFileSync(path, content);
        console.log('Patched server-http.js with debug logs');
    } else {
        console.log('Already patched');
    }
} catch (e) {
    console.error(e);
    process.exit(1);
}
