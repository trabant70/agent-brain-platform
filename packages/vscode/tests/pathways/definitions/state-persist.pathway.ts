/**
 * STATE_PERSIST Pathway Definition
 *
 * Flow: State Change → Serialization → Storage → Retrieval → Restoration
 *
 * This pathway tracks state persistence across sessions, including filter states,
 * view configurations, and user preferences.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Create a STATE_PERSIST pathway asserter for state save
 */
export function createStateSavePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.STATE_PERSIST)
        // 1. State change is detected
        .expectMilestone('OrchestratorState.setState', {
            message: /Setting state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 2. State is validated before save
        .expectMilestone('OrchestratorState.validateState', {
            message: /Validating state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 3. State is serialized
        .expectMilestone('OrchestratorState.serializeState', {
            message: /Serializing state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 4. State is saved to storage
        .expectMilestone('OrchestratorState.saveToStorage', {
            message: /Saving.*storage/i,
            category: LogCategory.ORCHESTRATION
        })

        // 5. Save confirmation
        .expectMilestone('OrchestratorState.saveComplete', {
            message: /State saved successfully/i,
            category: LogCategory.ORCHESTRATION
        });
}

/**
 * Create a STATE_PERSIST pathway asserter for state restore
 */
export function createStateRestorePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.STATE_PERSIST)
        // 1. Restoration is initiated
        .expectMilestone('OrchestratorState.restoreState', {
            message: /Restoring state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 2. State is loaded from storage
        .expectMilestone('OrchestratorState.loadFromStorage', {
            message: /Loading.*storage/i,
            category: LogCategory.ORCHESTRATION
        })

        // 3. State is deserialized
        .expectMilestone('OrchestratorState.deserializeState', {
            message: /Deserializing state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 4. State is validated after load
        .expectMilestone('OrchestratorState.validateRestoredState', {
            message: /Validating restored state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 5. State is applied
        .expectMilestone('OrchestratorState.applyRestoredState', {
            message: /Applying restored state/i,
            category: LogCategory.ORCHESTRATION
        })

        // 6. Restoration confirmation
        .expectMilestone('OrchestratorState.restoreComplete', {
            message: /State restored successfully/i,
            category: LogCategory.ORCHESTRATION
        });
}

/**
 * Filter state persistence pathway
 */
export function createFilterStatePersistPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.STATE_PERSIST)
        .expectMilestone('FilterController.saveFilterState', {
            message: /Saving filter state/i,
            category: LogCategory.FILTERING
        })
        .expectMilestone('OrchestratorState.saveToStorage', {
            message: /Saving.*storage/i
        })
        .expectMilestone('OrchestratorState.saveComplete');
}

/**
 * View configuration persistence pathway
 */
export function createViewConfigPersistPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.STATE_PERSIST)
        .expectMilestone('ViewConfig.saveConfiguration', {
            message: /Saving.*configuration/i,
            category: LogCategory.UI
        })
        .expectMilestone('OrchestratorState.saveToStorage')
        .expectMilestone('OrchestratorState.saveComplete');
}

/**
 * Complete round-trip persistence pathway (save + restore)
 */
export function createRoundTripPersistPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.STATE_PERSIST)
        // Save
        .expectMilestone('OrchestratorState.setState')
        .expectMilestone('OrchestratorState.serializeState')
        .expectMilestone('OrchestratorState.saveToStorage')
        .expectMilestone('OrchestratorState.saveComplete')
        // Restore
        .expectMilestone('OrchestratorState.restoreState')
        .expectMilestone('OrchestratorState.loadFromStorage')
        .expectMilestone('OrchestratorState.deserializeState')
        .expectMilestone('OrchestratorState.applyRestoredState')
        .expectMilestone('OrchestratorState.restoreComplete');
}
