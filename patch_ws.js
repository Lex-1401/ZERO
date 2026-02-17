import fs from 'fs';
const path = '/opt/zero/dist/gateway/server/ws-connection/message-handler.js';
try {
    let content = fs.readFileSync(path, 'utf8');

    // Allow skipping device identity if allowInsecureControlUi is true
    const target = 'const canSkipDevice = allowInsecureControlUi ? hasSharedAuth : hasTokenAuth;';
    const replacement = 'const canSkipDevice = allowInsecureControlUi || hasSharedAuth;';

    if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(path, content);
        console.log('Patched message-handler.js to allow skipping device identity for Control UI');
    } else {
        console.log('Target not found in message-handler.js');
    }
} catch (e) {
    console.error(e);
}
