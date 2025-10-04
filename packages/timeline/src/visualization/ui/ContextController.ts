/**
 * ContextController - Context Information Management
 * Stage 5: Extracted from embedded JavaScript code
 *
 * Handles:
 * - File/repository context display
 * - Context information updates
 * - Status information management
 * - UI context synchronization
 */

export interface ContextInfo {
    currentFile?: string;
    repoName?: string;
    branch?: string;
    status?: string;
}

export interface ContextControllerOptions {
    defaultFile?: string;
    defaultRepo?: string;
}

/**
 * Context controller for managing timeline context information
 */
export class ContextController {
    private d3: any;
    private currentContext: ContextInfo;

    constructor(options: ContextControllerOptions = {}) {
        // D3 is available globally in webview context
        this.d3 = (window as any).d3;

        this.currentContext = {
            currentFile: options.defaultFile || 'No file selected',
            repoName: options.defaultRepo || 'Loading...',
            branch: 'main',
            status: 'Ready'
        };

        this.initializeContextDisplay();
    }

    /**
     * Initialize context display elements
     */
    private initializeContextDisplay(): void {
        this.updateContextDisplay();
    }

    /**
     * Update context information from data
     */
    updateContextInfo(data: any): void {
        if (data.currentFile !== undefined) {
            this.currentContext.currentFile = data.currentFile || 'No file selected';
        }

        if (data.repoName !== undefined) {
            this.currentContext.repoName = data.repoName || 'Unknown Repository';
        }

        if (data.branch !== undefined) {
            this.currentContext.branch = data.branch;
        }

        if (data.status !== undefined) {
            this.currentContext.status = data.status;
        }

        this.updateContextDisplay();
    }

    /**
     * Update the context display in the UI
     */
    private updateContextDisplay(): void {
        // Update current file
        const fileElement = this.d3.select('#current-file');
        if (!fileElement.empty()) {
            fileElement.text(this.currentContext.currentFile || '-');
        }

        // Update repository name
        const repoElement = this.d3.select('#current-repo');
        if (!repoElement.empty()) {
            repoElement.text(this.currentContext.repoName || '-');
        }

        // Update branch if element exists
        const branchElement = this.d3.select('#current-branch');
        if (!branchElement.empty()) {
            branchElement.text(this.currentContext.branch || '-');
        }

        // Update status if element exists
        const statusElement = this.d3.select('#current-status');
        if (!statusElement.empty()) {
            statusElement.text(this.currentContext.status || 'Ready');
        }
    }

    /**
     * Set current file context
     */
    setCurrentFile(fileName: string): void {
        this.currentContext.currentFile = fileName;
        this.updateContextDisplay();
    }

    /**
     * Set repository context
     */
    setRepository(repoName: string): void {
        this.currentContext.repoName = repoName;
        this.updateContextDisplay();
    }

    /**
     * Set branch context
     */
    setBranch(branchName: string): void {
        this.currentContext.branch = branchName;
        this.updateContextDisplay();
    }

    /**
     * Set status message
     */
    setStatus(status: string): void {
        this.currentContext.status = status;
        this.updateContextDisplay();
    }

    /**
     * Get current context information
     */
    getCurrentContext(): ContextInfo {
        return { ...this.currentContext };
    }

    /**
     * Reset context to default values
     */
    resetContext(): void {
        this.currentContext = {
            currentFile: 'No file selected',
            repoName: 'Loading...',
            branch: 'main',
            status: 'Ready'
        };

        this.updateContextDisplay();
    }

    /**
     * Show loading state
     */
    showLoading(message: string = 'Loading...'): void {
        this.setStatus(message);
    }

    /**
     * Show error state
     */
    showError(error: string): void {
        this.setStatus(`Error: ${error}`);
    }

    /**
     * Show success state
     */
    showSuccess(message: string = 'Success'): void {
        this.setStatus(message);

        // Auto-clear success message after delay
        setTimeout(() => {
            this.setStatus('Ready');
        }, 3000);
    }

    /**
     * Update context with partial information
     */
    updatePartialContext(partialContext: Partial<ContextInfo>): void {
        this.currentContext = { ...this.currentContext, ...partialContext };
        this.updateContextDisplay();
    }

    /**
     * Format file path for display
     */
    private formatFilePath(filePath: string): string {
        if (!filePath || filePath === 'No file selected') {
            return filePath;
        }

        // Truncate long paths
        const maxLength = 50;
        if (filePath.length > maxLength) {
            return '...' + filePath.slice(-(maxLength - 3));
        }

        return filePath;
    }

    /**
     * Format repository name for display
     */
    private formatRepoName(repoName: string): string {
        if (!repoName || repoName === 'Loading...') {
            return repoName;
        }

        // Remove common prefixes
        return repoName.replace(/^.*[\/\\]/, '').replace(/\.git$/, '');
    }

    /**
     * Get context summary for debugging
     */
    getContextSummary(): string {
        return `Repo: ${this.currentContext.repoName}, File: ${this.currentContext.currentFile}, Branch: ${this.currentContext.branch}, Status: ${this.currentContext.status}`;
    }
}