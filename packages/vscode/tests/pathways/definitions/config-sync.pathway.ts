/**
 * CONFIG_SYNC Pathway Definition
 *
 * Flow: Configuration Change → State Update → UI Updates → Persistence
 *
 * This pathway tracks configuration synchronization across the extension,
 * including user preferences, theme changes, and feature toggles.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Configuration change pathway (VS Code settings → Extension)
 */
export function createConfigChangePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Configuration change is detected
        .expectMilestone('extension.onConfigurationChange', {
            message: /Configuration.*changed/i,
            category: LogCategory.EXTENSION
        })

        // 2. New config is loaded
        .expectMilestone('extension.loadConfiguration', {
            message: /Loading.*configuration/i,
            category: LogCategory.EXTENSION
        })

        // 3. Config is validated
        .expectMilestone('extension.validateConfiguration', {
            message: /Validating.*configuration/i,
            category: LogCategory.EXTENSION
        })

        // 4. Config is applied to orchestrator
        .expectMilestone('DataOrchestrator.applyConfig', {
            message: /Applying.*configuration/i,
            category: LogCategory.ORCHESTRATION
        })

        // 5. Webview is notified
        .expectMilestone('extension.notifyWebviewConfigChange', {
            message: /Notifying webview.*config/i,
            category: LogCategory.WEBVIEW
        })

        // 6. Webview applies config
        .expectMilestone('webview.applyConfiguration', {
            message: /Applying.*configuration/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Theme change pathway
 */
export function createThemeChangePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Theme change is detected
        .expectMilestone('extension.onThemeChange', {
            message: /Theme.*changed/i,
            category: LogCategory.EXTENSION
        })

        // 2. New theme is loaded
        .expectMilestone('ThemeController.loadTheme', {
            message: /Loading.*theme/i,
            category: LogCategory.UI
        })

        // 3. CSS variables are updated
        .expectMilestone('ThemeController.updateCSSVariables', {
            message: /Updating CSS variables/i,
            category: LogCategory.UI
        })

        // 4. Webview is notified
        .expectMilestone('extension.notifyWebviewThemeChange', {
            message: /Notifying webview.*theme/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Webview applies theme
        .expectMilestone('webview.applyTheme', {
            message: /Applying.*theme/i,
            category: LogCategory.WEBVIEW
        })

        // 6. Timeline re-renders
        .expectMilestone('SimpleTimelineApp.rerender', {
            message: /Re-rendering.*theme/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Color mode change pathway (semantic vs sync-state)
 */
export function createColorModeChangePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Color mode toggle is triggered
        .expectMilestone('webview.toggleColorMode', {
            message: /Toggle.*color mode/i,
            category: LogCategory.UI
        })

        // 2. Mode is validated
        .expectMilestone('EventVisualTheme.validateMode', {
            message: /Validating.*mode/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Color mode is updated
        .expectMilestone('EventVisualTheme.setColorMode', {
            message: /Setting color mode/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Active providers are updated
        .expectMilestone('EventVisualTheme.setActiveProviders', {
            message: /Updated active providers/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Timeline re-renders with new colors
        .expectMilestone('SimpleTimelineApp.rerender', {
            message: /Re-rendering.*color mode/i,
            category: LogCategory.VISUALIZATION
        })

        // 6. Legend updates to show new color mapping
        .expectMilestone('LegendRenderer.updateColorMapping', {
            message: /Updating legend.*color/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Provider enable/disable pathway
 */
export function createProviderTogglePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Provider toggle is triggered
        .expectMilestone('webview.toggleProvider', {
            message: /Toggle.*provider/i,
            category: LogCategory.UI
        })

        // 2. Extension receives toggle request
        .expectMilestone('extension.handleProviderToggle', {
            message: /Handling provider toggle/i,
            category: LogCategory.EXTENSION
        })

        // 3. Provider state is updated
        .expectMilestone('DataOrchestrator.updateProviderState', {
            message: /Updating provider state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 4. Data is re-fetched (if provider enabled)
        .expectOptionalMilestone('DataOrchestrator.refreshData', {
            message: /Refreshing.*data/i,
            category: LogCategory.ORCHESTRATION
        })

        // 5. Webview is notified
        .expectMilestone('extension.notifyWebviewProviderChange', {
            message: /Notifying webview.*provider/i,
            category: LogCategory.WEBVIEW
        })

        // 6. Timeline updates
        .expectMilestone('SimpleTimelineApp.handleProviderChange', {
            message: /Handling provider change/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Filter configuration persistence pathway
 */
export function createFilterConfigPersistPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Filter config changes
        .expectMilestone('FilterController.onConfigChange', {
            message: /Filter.*config.*changed/i,
            category: LogCategory.FILTERING
        })

        // 2. Config is validated
        .expectMilestone('FilterController.validateFilterConfig', {
            message: /Validating filter config/i,
            category: LogCategory.FILTERING
        })

        // 3. State is updated
        .expectMilestone('FilterController.updateState', {
            message: /Updating filter state/i,
            category: LogCategory.FILTERING
        })

        // 4. Config is persisted
        .expectMilestone('OrchestratorState.saveFilterConfig', {
            message: /Saving filter config/i,
            category: LogCategory.ORCHESTRATION
        })

        // 5. UI reflects new config
        .expectMilestone('FilterController.updateUI', {
            message: /Updating filter UI/i,
            category: LogCategory.UI
        });
}

/**
 * Feature flag change pathway
 */
export function createFeatureFlagChangePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Feature flag is toggled
        .expectMilestone('FeatureFlags.toggleFlag', {
            message: /Toggle.*feature flag/i,
            category: LogCategory.EXTENSION
        })

        // 2. Flag state is validated
        .expectMilestone('FeatureFlags.validateFlag', {
            message: /Validating.*flag/i,
            category: LogCategory.EXTENSION
        })

        // 3. Dependent features are updated
        .expectMilestone('FeatureFlags.updateDependentFeatures', {
            message: /Updating dependent features/i,
            category: LogCategory.EXTENSION
        })

        // 4. UI components are notified
        .expectMilestone('extension.notifyFeatureChange', {
            message: /Notifying.*feature change/i,
            category: LogCategory.EXTENSION
        })

        // 5. UI updates to reflect flag state
        .expectMilestone('webview.handleFeatureChange', {
            message: /Handling feature change/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Workspace configuration sync pathway
 */
export function createWorkspaceConfigSyncPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.CONFIG_SYNC)
        // 1. Workspace config is loaded
        .expectMilestone('extension.loadWorkspaceConfig', {
            message: /Loading workspace config/i,
            category: LogCategory.EXTENSION
        })

        // 2. Config is merged with defaults
        .expectMilestone('extension.mergeConfig', {
            message: /Merging.*config/i,
            category: LogCategory.EXTENSION
        })

        // 3. Effective config is calculated
        .expectMilestone('extension.calculateEffectiveConfig', {
            message: /Calculating effective config/i,
            category: LogCategory.EXTENSION
        })

        // 4. Config is applied
        .expectMilestone('DataOrchestrator.applyConfig', {
            message: /Applying.*configuration/i,
            category: LogCategory.ORCHESTRATION
        })

        // 5. Webview receives final config
        .expectMilestone('webview.receiveConfig', {
            message: /Received.*configuration/i,
            category: LogCategory.WEBVIEW
        });
}
