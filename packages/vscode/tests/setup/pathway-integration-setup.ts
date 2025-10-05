/**
 * Setup file for pathway integration tests
 * Configures jsdom environment with required globals
 */

import { TextEncoder, TextDecoder } from 'util';

// Set up globals required by jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Import standard pathway setup
import './pathway-setup';
