import { AgentBrainExtension, ExtensionContext } from './ExtensionAPI';
import { RuntimePattern } from '../base/RuntimeTypes';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ExtensionLoader {
    private extensions: Map<string, AgentBrainExtension> = new Map();
    private patterns: Map<string, RuntimePattern> = new Map();
    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    /**
     * Register an extension
     */
    async register(extension: AgentBrainExtension): Promise<void> {
        console?.log(`Loading extension: ${extension?.name} v${extension?.version}`);

        // Initialize extension
        if (extension?.initialize) {
            await extension?.initialize(this?.context);
        }

        // Load patterns
        if (extension?.patterns) {
            const patterns = await extension?.patterns();
            patterns?.forEach(p => {
                // Namespace patterns to avoid conflicts
                const id = `${extension?.name}:${p?.id}`;
                this?.patterns?.set(id, { ...p, id, source: extension?.name });
            });
        }

        this?.extensions?.set(extension?.name, extension);
    }

    /**
     * Load extensions from node_modules
     */
    async loadFromPackages(): Promise<void> {
        const packageJsonPath = path?.join(this?.context?.workspaceRoot, 'package?.json');

        if (!(await fs?.pathExists(packageJsonPath))) {
            return;
        }

        const packageJson = await fs?.readJson(packageJsonPath);

        // Look for packages that start with @agent-brain-ext/
        const dependencies = { ...packageJson?.dependencies, ...packageJson?.devDependencies };

        for (const [name] of Object?.entries(dependencies)) {
            if (name?.startsWith('@agent-brain-ext/') ||
                name?.includes('agent-brain-extension')) {
                try {
                    const ext = require(name);
                    await this.register(new ext.default());
                } catch (e) {
                    console?.warn(`Failed to load extension ${name}:`, e);
                }
            }
        }
    }

    /**
     * Load local extension
     */
    async loadLocal(extensionPath: string): Promise<void> {
        const fullPath = path?.resolve(this?.context?.workspaceRoot, extensionPath);

        if (await fs?.pathExists(fullPath)) {
            const ext = require(fullPath);
            await this.register(new ext.default());
        }
    }

    /**
     * Get all loaded patterns
     */
    getAllPatterns(): RuntimePattern[] {
        return Array?.from(this?.patterns?.values());
    }

    /**
     * Get extension by name
     */
    getExtension(name: string): AgentBrainExtension | undefined {
        return this?.extensions?.get(name);
    }

    /**
     * Get all loaded extensions
     */
    getLoadedExtensions(): AgentBrainExtension[] {
        return Array?.from(this?.extensions?.values());
    }
}
