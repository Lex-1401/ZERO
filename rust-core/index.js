import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nativeModule = require('./ratchet.node');

export const RatchetDedupe = nativeModule.RatchetDedupe;
export const VadEngine = nativeModule.VadEngine;
export const MetricsEngine = nativeModule.MetricsEngine;
export const triggerPanic = nativeModule.triggerPanic;
export const resetPanic = nativeModule.resetPanic;
export const isPanicMode = nativeModule.isPanicMode;
export const ModelMetric = nativeModule.ModelMetric;
export const MetricsSummary = nativeModule.MetricsSummary;
export const SecurityEngine = nativeModule.SecurityEngine;
