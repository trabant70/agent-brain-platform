import * as vscode from 'vscode';
/**
 * Data Providers - Tier 1 Data Acquisition
 *
 * All providers transform external data into CanonicalEvents
 */

// Base provider interfaces and registry
export * from './base';

// Git provider (local repository)
export * from './git';

// GitHub provider (GitHub API)
export * from './github';
