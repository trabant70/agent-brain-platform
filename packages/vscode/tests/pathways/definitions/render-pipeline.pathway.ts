/**
 * RENDER_PIPELINE Pathway Definition
 *
 * Flow: Data Processing → D3 Scales → Element Creation → DOM Updates → Animation
 *
 * This pathway tracks the complete rendering pipeline from processed data
 * to final DOM updates and visual output.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Create a RENDER_PIPELINE pathway asserter with expected milestones
 */
export function createRenderPipelinePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RENDER_PIPELINE)
        // 1. Rendering is initiated
        .expectMilestone('SimpleTimelineApp.render', {
            message: /Starting render/i,
            category: LogCategory.VISUALIZATION
        })

        // 2. Data is preprocessed for visualization
        .expectMilestone('TimelineDataProcessor.processData', {
            message: /Processing.*data.*visualization/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Time scales are calculated
        .expectMilestone('D3TimelineRenderer.calculateScales', {
            message: /Calculating.*scales/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. SVG canvas is prepared
        .expectMilestone('D3TimelineRenderer.prepareSVG', {
            message: /Preparing SVG/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Events are rendered to DOM
        .expectMilestone('EventRenderer.renderEvents', {
            message: /Rendering.*events/i,
            category: LogCategory.VISUALIZATION
        })

        // 6. Legend is rendered
        .expectMilestone('LegendRenderer.renderLegend', {
            message: /Rendering legend/i,
            category: LogCategory.VISUALIZATION
        })

        // 7. Range selector is rendered
        .expectOptionalMilestone('RangeSelector.render', {
            message: /Rendering range selector/i,
            category: LogCategory.VISUALIZATION
        })

        // 8. Statistics are updated
        .expectMilestone('StatisticsCalculator.updateStats', {
            message: /Updating statistics/i,
            category: LogCategory.VISUALIZATION
        })

        // 9. Interactions are bound
        .expectMilestone('InteractionHandler.bindEvents', {
            message: /Binding.*interactions/i,
            category: LogCategory.VISUALIZATION
        })

        // 10. Render complete
        .expectMilestone('D3TimelineRenderer.renderComplete', {
            message: /Render complete|Timeline rendered/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Initial render pathway (first render after data load)
 */
export function createInitialRenderPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RENDER_PIPELINE)
        .expectMilestone('SimpleTimelineApp.render', {
            message: /Initial render/i
        })
        .expectMilestone('TimelineDataProcessor.processData')
        .expectMilestone('D3TimelineRenderer.calculateScales')
        .expectMilestone('D3TimelineRenderer.prepareSVG')
        .expectMilestone('EventRenderer.renderEvents')
        .expectMilestone('LegendRenderer.renderLegend')
        .expectMilestone('D3TimelineRenderer.renderComplete');
}

/**
 * Re-render pathway (triggered by filter/resize)
 */
export function createReRenderPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RENDER_PIPELINE)
        .expectMilestone('SimpleTimelineApp.rerender', {
            message: /Re-rendering timeline/i
        })
        .expectMilestone('D3TimelineRenderer.clearCanvas', {
            message: /Clearing canvas/i
        })
        .expectMilestone('D3TimelineRenderer.calculateScales')
        .expectMilestone('EventRenderer.renderEvents')
        .expectMilestone('StatisticsCalculator.updateStats')
        .expectMilestone('D3TimelineRenderer.renderComplete');
}

/**
 * Resize render pathway (window/panel resize)
 */
export function createResizeRenderPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RENDER_PIPELINE)
        .expectMilestone('SimpleTimelineApp.handleResize', {
            message: /Handling resize/i
        })
        .expectMilestone('D3TimelineRenderer.recalculateDimensions', {
            message: /Recalculating dimensions/i
        })
        .expectMilestone('D3TimelineRenderer.calculateScales')
        .expectMilestone('EventRenderer.renderEvents')
        .expectMilestone('D3TimelineRenderer.renderComplete');
}

/**
 * Incremental update pathway (small data changes)
 */
export function createIncrementalUpdatePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RENDER_PIPELINE)
        .expectMilestone('D3TimelineRenderer.updateData', {
            message: /Updating.*data/i
        })
        .expectMilestone('EventRenderer.updateEvents', {
            message: /Updating events/i
        })
        .expectMilestone('StatisticsCalculator.updateStats')
        .expectMilestone('D3TimelineRenderer.renderComplete');
}
