import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Simple shim to allow running .ts files via node --import
register('tsx', pathToFileURL('./'));
