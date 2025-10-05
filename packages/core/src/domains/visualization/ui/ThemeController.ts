/**
 * ThemeController - Theme Management and UI Styling
 * Stage 5: Extracted from embedded JavaScript code
 *
 * Handles:
 * - Theme switching functionality
 * - Theme selector UI management
 * - CSS class management for themes
 * - Theme state persistence
 * - Dynamic styling updates
 */

export interface ThemeControllerOptions {
    defaultTheme?: string;
    onThemeChange?: (theme: string) => void;
    availableThemes?: ThemeDefinition[];
}

export interface ThemeDefinition {
    id: string;
    name: string;
    displayName: string;
}

/**
 * Theme controller for managing visual themes
 */
export class ThemeController {
    private d3: any;
    private currentTheme: string;
    private availableThemes: ThemeDefinition[];
    private onThemeChange?: (theme: string) => void;

    private static readonly DEFAULT_THEMES: ThemeDefinition[] = [
        { id: 'vscode', name: 'vscode', displayName: 'VS Code Theme' },
        { id: 'cosmic', name: 'cosmic', displayName: 'Cosmic Theme' }
    ];

    constructor(options: ThemeControllerOptions = {}) {
        // D3 is available globally in webview context
        this.d3 = (window as any).d3;

        this.currentTheme = options.defaultTheme || 'vscode';
        this.availableThemes = options.availableThemes || ThemeController.DEFAULT_THEMES;
        this.onThemeChange = options.onThemeChange;

        this.initializeThemeSelector();
        this.applyTheme(this.currentTheme);
    }

    /**
     * Initialize theme selector UI
     */
    private initializeThemeSelector(): void {
        const themeSelector = this.d3.select('#theme-selector');

        if (!themeSelector.empty()) {
            // Populate theme options
            this.populateThemeOptions();

            // Setup change handler
            themeSelector.on('change', (event: Event) => {
                const target = event.target as HTMLSelectElement;
                const selectedTheme = target.value;
                this.switchTheme(selectedTheme);
            });

            // Set initial value
            themeSelector.property('value', this.currentTheme);
        }
    }

    /**
     * Populate theme selector with available options
     */
    private populateThemeOptions(): void {
        const themeSelector = this.d3.select('#theme-selector');

        // Clear existing options
        themeSelector.selectAll('option').remove();

        // Add theme options
        themeSelector.selectAll('option')
            .data(this.availableThemes)
            .enter()
            .append('option')
            .attr('value', (d: ThemeDefinition) => d.id)
            .text((d: ThemeDefinition) => d.displayName);
    }

    /**
     * Switch to a new theme
     */
    switchTheme(themeId: string): void {
        if (themeId === this.currentTheme) {
            return; // No change needed
        }

        const theme = this.availableThemes.find(t => t.id === themeId);
        if (!theme) {
            console.warn(`Theme '${themeId}' not found`);
            return;
        }

        this.currentTheme = themeId;
        this.applyTheme(themeId);

        // Update selector
        this.d3.select('#theme-selector').property('value', themeId);

        // Notify observers
        if (this.onThemeChange) {
            this.onThemeChange(themeId);
        }

        console.log(`Theme switched to: ${theme.displayName}`);
    }

    /**
     * Apply theme to the document
     */
    applyTheme(themeId: string): void {
        // Remove existing theme classes
        this.availableThemes.forEach(theme => {
            document.body.classList.remove(`theme-${theme.id}`);
        });

        // Apply new theme class
        document.body.className = `theme-${themeId}`;

        this.currentTheme = themeId;
    }

    /**
     * Get current theme
     */
    getCurrentTheme(): string {
        return this.currentTheme;
    }

    /**
     * Get current theme definition
     */
    getCurrentThemeDefinition(): ThemeDefinition | undefined {
        return this.availableThemes.find(t => t.id === this.currentTheme);
    }

    /**
     * Add a new theme
     */
    addTheme(theme: ThemeDefinition): void {
        // Check if theme already exists
        const existingIndex = this.availableThemes.findIndex(t => t.id === theme.id);

        if (existingIndex >= 0) {
            // Update existing theme
            this.availableThemes[existingIndex] = theme;
        } else {
            // Add new theme
            this.availableThemes.push(theme);
        }

        // Refresh theme selector
        this.populateThemeOptions();
    }

    /**
     * Remove a theme
     */
    removeTheme(themeId: string): void {
        const index = this.availableThemes.findIndex(t => t.id === themeId);

        if (index >= 0) {
            this.availableThemes.splice(index, 1);

            // If we're removing the current theme, switch to default
            if (this.currentTheme === themeId) {
                this.switchTheme(this.availableThemes[0]?.id || 'vscode');
            }

            // Refresh theme selector
            this.populateThemeOptions();
        }
    }

    /**
     * Get available themes
     */
    getAvailableThemes(): ThemeDefinition[] {
        return [...this.availableThemes];
    }

    /**
     * Toggle between two themes
     */
    toggleTheme(theme1: string, theme2: string): void {
        const nextTheme = this.currentTheme === theme1 ? theme2 : theme1;
        this.switchTheme(nextTheme);
    }

    /**
     * Set theme from external source (e.g., settings)
     */
    setThemeFromExternal(themeId: string): void {
        this.switchTheme(themeId);
    }

    /**
     * Get theme-specific CSS variables
     */
    getThemeVariables(): { [key: string]: string } {
        const style = getComputedStyle(document.body);
        const variables: { [key: string]: string } = {};

        // Common CSS variables to extract
        const variableNames = [
            '--bg-primary',
            '--bg-secondary',
            '--bg-tertiary',
            '--text-primary',
            '--text-secondary',
            '--accent-commit',
            '--accent-pr',
            '--accent-issue',
            '--accent-release',
            '--accent-branch'
        ];

        variableNames.forEach(varName => {
            const value = style.getPropertyValue(varName).trim();
            if (value) {
                variables[varName] = value;
            }
        });

        return variables;
    }

    /**
     * Apply custom CSS variables
     */
    applyCustomVariables(variables: { [key: string]: string }): void {
        Object.entries(variables).forEach(([name, value]) => {
            document.documentElement.style.setProperty(name, value);
        });
    }

    /**
     * Reset to default theme
     */
    resetToDefault(): void {
        this.switchTheme('vscode');
    }

    /**
     * Check if theme is dark mode
     */
    isDarkTheme(): boolean {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-primary');
        // Simple heuristic: if background is dark, it's a dark theme
        return bgColor.includes('#') && bgColor !== '#ffffff';
    }

    /**
     * Get theme mode (light/dark)
     */
    getThemeMode(): 'light' | 'dark' | 'auto' {
        return this.isDarkTheme() ? 'dark' : 'light';
    }
}