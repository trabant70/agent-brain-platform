/**
 * DATA_INGESTION Pathway Definition
 *
 * Flow: Git Provider → DataOrchestrator → Extension → Webview → Render
 *
 * This pathway tracks the complete data ingestion flow from git repository
 * through the orchestrator, to the webview, and finally rendering on screen.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Create a DATA_INGESTION pathway asserter with expected milestones
 */
export function createDataIngestionPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.DATA_INGESTION)
        // 1. Extension initiates data fetch
        .expectMilestone('extension.activate', {
            message: /Extension.*activated/i
        })

        // 2. Orchestrator starts data collection
        .expectMilestone('DataOrchestrator.getEvents', {
            message: /Getting events/i,
            category: LogCategory.ORCHESTRATION
        })

        // 3. Git provider fetches repository data
        .expectMilestone('GitDataProvider.fetchEvents', {
            message: /Fetching.*git.*events/i,
            category: LogCategory.DATA
        })

        // 4. Events are collected and normalized
        .expectMilestone('GitDataProvider.normalizeEvents', {
            message: /Normalizing.*events/i,
            category: LogCategory.DATA
        })

        // 5. Orchestrator receives provider data
        .expectMilestone('DataOrchestrator.mergeProviderData', {
            message: /Merging.*provider.*data/i,
            category: LogCategory.ORCHESTRATION
        })

        // 6. Data is sent to webview
        .expectMilestone('extension.sendToWebview', {
            message: /Sending.*data.*webview/i,
            category: LogCategory.WEBVIEW
        })

        // 7. Webview receives timeline data
        .expectMilestone('handleTimelineData', {
            message: /Received timeline data/i,
            category: LogCategory.WEBVIEW
        })

        // 8. Data is passed to TimelineApp
        .expectMilestone('SimpleTimelineApp.handleTimelineData', {
            message: /Passing data to TimelineApp/i,
            category: LogCategory.WEBVIEW
        })

        // 9. Renderer processes the data
        .expectMilestone('D3TimelineRenderer.render', {
            message: /Rendering timeline/i,
            category: LogCategory.VISUALIZATION
        })

        // 10. DOM is updated (final milestone)
        .expectMilestone('D3TimelineRenderer.updateDOM', {
            message: /Timeline rendered|DOM updated/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Minimal DATA_INGESTION pathway (just core milestones)
 */
export function createMinimalDataIngestionPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.DATA_INGESTION)
        .expectMilestone('DataOrchestrator.getEvents')
        .expectMilestone('GitDataProvider.fetchEvents')
        .expectMilestone('handleTimelineData')
        .expectMilestone('D3TimelineRenderer.render');
}

/**
 * Extended DATA_INGESTION pathway (includes optional caching)
 */
export function createExtendedDataIngestionPathway(): PathwayAsserter {
    return createDataIngestionPathway()
        // Optional: Cache operations
        .expectOptionalMilestone('CacheManager.checkCache', {
            message: /Checking cache/i,
            category: LogCategory.CACHE
        })
        .expectOptionalMilestone('CacheManager.saveCache', {
            message: /Saving.*cache/i,
            category: LogCategory.CACHE
        });
}
