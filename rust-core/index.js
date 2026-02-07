import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Platform-specific binary loading
function loadNativeModule() {
    const { platform, arch } = process;
    const platformSpecific = {
        'darwin-arm64': 'ratchet.darwin-arm64.node',
        'darwin-x64': 'ratchet.darwin-x64.node',
        'linux-x64-gnu': 'ratchet.linux-x64-gnu.node',
        'linux-arm64-gnu': 'ratchet.linux-arm64-gnu.node',
        'win32-x64-msvc': 'ratchet.win32-x64-msvc.node',
    };

    // Try generic ratchet.node first (for dev convenience)
    const genericPath = path.join(__dirname, 'ratchet.node');
    if (fs.existsSync(genericPath)) {
        return require(genericPath);
    }

    // Map current platform to expected binary name
    const platformArch = `${platform}-${arch}`;
    const candidates = [
        platformSpecific[platformArch],
        platformSpecific[`${platformArch}-gnu`],
        platformSpecific[`${platformArch}-msvc`],
        `ratchet.${platform}-${arch}.node`,
    ].filter(Boolean);

    for (const candidate of candidates) {
        const modulePath = path.join(__dirname, candidate);
        if (fs.existsSync(modulePath)) {
            return require(modulePath);
        }
    }

    throw new Error(
        `Failed to load native module for platform ${platform}-${arch}. ` +
        `Expected one of: ${candidates.join(', ')}`
    );
}

const nativeModule = loadNativeModule();

export const RatchetDedupe = nativeModule.RatchetDedupe;
export const VadEngine = nativeModule.VadEngine;
export const MetricsEngine = nativeModule.MetricsEngine;
export const triggerPanic = nativeModule.triggerPanic;
export const resetPanic = nativeModule.resetPanic;
export const isPanicMode = nativeModule.isPanicMode;
export const ModelMetric = nativeModule.ModelMetric;
export const MetricsSummary = nativeModule.MetricsSummary;
export const SecurityEngine = nativeModule.SecurityEngine;
