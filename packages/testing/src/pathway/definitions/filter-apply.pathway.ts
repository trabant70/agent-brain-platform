/**
 * FILTER_APPLY Pathway Definition
 *
 * Flow: Filter UI → FilterController → State Update → Data Refresh → Re-render
 *
 * This pathway tracks the complete filter application flow from user interaction
 * through state management to re-rendering the filtered timeline.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Create a FILTER_APPLY pathway asserter with expected milestones
 */
export function createFilterApplyPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.FILTER_APPLY)
        // 1. User interacts with filter UI
        .expectMilestone('FilterController.handleFilterChange', {
            message: /Filter.*changed/i,
            category: LogCategory.UI
        })

        // 2. Filter state is updated
        .expectMilestone('FilterController.updateFilterState', {
            message: /Updating filter state/i,
            category: LogCategory.FILTERING
        })

        // 3. Filter configuration is validated
        .expectMilestone('FilterController.validateFilters', {
            message: /Validating filters/i,
            category: LogCategory.FILTERING
        })

        // 4. Filters are applied to data
        .expectMilestone('FilterController.applyFilters', {
            message: /Applying filters/i,
            category: LogCategory.FILTERING
        })

        // 5. Filtered event count is calculated
        .expectMilestone('FilterController.calculateFilteredCount', {
            message: /Calculated.*filtered.*events/i,
            category: LogCategory.FILTERING
        })

        // 6. State is persisted (optional for some filter types)
        .expectOptionalMilestone('FilterController.persistState', {
            message: /Persisting filter state/i,
            category: LogCategory.FILTERING
        })

        // 7. Webview is notified of filter change
        .expectMilestone('extension.sendFilteredData', {
            message: /Sending filtered data/i,
            category: LogCategory.WEBVIEW
        })

        // 8. Webview receives filtered data
        .expectMilestone('handleTimelineData', {
            message: /Received.*filtered.*data/i,
            category: LogCategory.WEBVIEW
        })

        // 9. Timeline re-renders with filtered data
        .expectMilestone('SimpleTimelineApp.handleTimelineData', {
            message: /Re-rendering with filtered data/i,
            category: LogCategory.VISUALIZATION
        })

        // 10. Statistics are updated
        .expectMilestone('StatisticsCalculator.updateStats', {
            message: /Updating statistics/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Event type filter pathway (specific filter type)
 */
export function createEventTypeFilterPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.FILTER_APPLY)
        .expectMilestone('FilterController.handleFilterChange', {
            message: /Event type filter/i
        })
        .expectMilestone('FilterController.applyFilters')
        .expectMilestone('FilterController.calculateFilteredCount')
        .expectMilestone('SimpleTimelineApp.handleTimelineData');
}

/**
 * Date range filter pathway (specific filter type)
 */
export function createDateRangeFilterPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.FILTER_APPLY)
        .expectMilestone('FilterController.handleFilterChange', {
            message: /Date range filter/i
        })
        .expectMilestone('FilterController.validateDateRange', {
            message: /Validating date range/i
        })
        .expectMilestone('FilterController.applyFilters')
        .expectMilestone('SimpleTimelineApp.handleTimelineData');
}

/**
 * Author filter pathway (specific filter type)
 */
export function createAuthorFilterPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.FILTER_APPLY)
        .expectMilestone('FilterController.handleFilterChange', {
            message: /Author filter/i
        })
        .expectMilestone('FilterController.applyFilters')
        .expectMilestone('SimpleTimelineApp.handleTimelineData');
}
