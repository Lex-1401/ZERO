import { discoverZEROPlugins } from './dist/plugins/discovery.js';
import { loadZEROPlugins } from './dist/plugins/loader.js';
import { resolveBundledPluginsDir } from './dist/plugins/bundled-dir.js';

console.log('Bundled dir:', resolveBundledPluginsDir());

console.log('Discovering plugins...');
const result = discoverZEROPlugins({ workspaceDir: process.cwd() });
console.log('Candidates:', result.candidates.map(c => c.idHint));
console.log('Diagnostics:', JSON.stringify(result.diagnostics, null, 2));

console.log('Loading plugins...');
const loaded = loadZEROPlugins({ workspaceDir: process.cwd(), mode: 'full' });
console.log('Loaded plugins:', loaded.plugins.map(p => `${p.id} (${p.status})`));
console.log('Loaded diagnostics:', JSON.stringify(loaded.diagnostics, null, 2));
