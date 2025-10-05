/**
 * RANGE_SELECTOR Pathway Definition
 *
 * Flow: Slider Interaction → Brush Update → Viewport Change → Timeline Re-render
 *
 * This pathway tracks the range selector (time slider) interactions and their
 * effect on the timeline viewport.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Range selector initialization pathway
 */
export function createRangeSelectorInitPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Range selector initialization starts
        .expectMilestone('RangeSelector.initialize', {
            message: /Initializing range selector/i,
            category: LogCategory.VISUALIZATION
        })

        // 2. Bar chart data is prepared
        .expectMilestone('RangeSelector.prepareBarChartData', {
            message: /Preparing bar chart data/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Time scale is calculated
        .expectMilestone('RangeSelector.calculateTimeScale', {
            message: /Calculating.*scale/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Bar chart is rendered
        .expectMilestone('RangeSelector.renderBarChart', {
            message: /Rendering bar chart/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Brush is initialized
        .expectMilestone('RangeSelector.initializeBrush', {
            message: /Initializing brush/i,
            category: LogCategory.VISUALIZATION
        })

        // 6. Initial range is set
        .expectMilestone('RangeSelector.setInitialRange', {
            message: /Setting initial range/i,
            category: LogCategory.VISUALIZATION
        })

        // 7. Range labels are updated
        .expectMilestone('RangeSelector.updateLabels', {
            message: /Updating.*labels/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Brush drag interaction pathway
 */
export function createBrushDragPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Brush drag starts
        .expectMilestone('RangeSelector.onBrushStart', {
            message: /Brush.*start/i,
            category: LogCategory.UI
        })

        // 2. Brush position is updated
        .expectMilestone('RangeSelector.onBrushMove', {
            message: /Brush.*move/i,
            category: LogCategory.UI
        })

        // 3. New range is calculated
        .expectMilestone('RangeSelector.calculateRange', {
            message: /Calculating.*range/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Range labels are updated
        .expectMilestone('RangeSelector.updateLabels', {
            message: /Updating.*labels/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Brush drag ends
        .expectMilestone('RangeSelector.onBrushEnd', {
            message: /Brush.*end/i,
            category: LogCategory.UI
        })

        // 6. Viewport is updated
        .expectMilestone('RangeSelector.updateViewport', {
            message: /Updating viewport/i,
            category: LogCategory.VISUALIZATION
        })

        // 7. Timeline re-renders with new range
        .expectMilestone('SimpleTimelineApp.handleRangeChange', {
            message: /Handling range change/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Brush resize interaction pathway
 */
export function createBrushResizePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Resize handle is grabbed
        .expectMilestone('RangeSelector.onResizeStart', {
            message: /Resize.*start/i,
            category: LogCategory.UI
        })

        // 2. Brush extent is updated
        .expectMilestone('RangeSelector.updateBrushExtent', {
            message: /Updating brush extent/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Range is recalculated
        .expectMilestone('RangeSelector.calculateRange', {
            message: /Calculating.*range/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Labels are updated
        .expectMilestone('RangeSelector.updateLabels', {
            message: /Updating.*labels/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Resize ends
        .expectMilestone('RangeSelector.onResizeEnd', {
            message: /Resize.*end/i,
            category: LogCategory.UI
        })

        // 6. Viewport updates
        .expectMilestone('RangeSelector.updateViewport', {
            message: /Updating viewport/i,
            category: LogCategory.VISUALIZATION
        })

        // 7. Timeline re-renders
        .expectMilestone('SimpleTimelineApp.handleRangeChange', {
            message: /Handling range change/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Programmatic range update pathway (from timeline zoom)
 */
export function createProgrammaticRangeUpdatePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Timeline zoom occurs
        .expectMilestone('D3TimelineRenderer.onZoom', {
            message: /Zoom.*event/i,
            category: LogCategory.UI
        })

        // 2. New viewport is calculated
        .expectMilestone('D3TimelineRenderer.calculateViewport', {
            message: /Calculating viewport/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Range selector is notified
        .expectMilestone('RangeSelector.updateFromTimeline', {
            message: /Updating.*from timeline/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Brush is moved programmatically
        .expectMilestone('RangeSelector.moveBrush', {
            message: /Moving brush/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Labels are updated
        .expectMilestone('RangeSelector.updateLabels', {
            message: /Updating.*labels/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Range selector data update pathway (after filter)
 */
export function createRangeSelectorDataUpdatePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Filtered data is received
        .expectMilestone('RangeSelector.onDataUpdate', {
            message: /Data.*update/i,
            category: LogCategory.VISUALIZATION
        })

        // 2. Bar chart data is recalculated
        .expectMilestone('RangeSelector.recalculateBarChart', {
            message: /Recalculating bar chart/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Time scale is updated
        .expectMilestone('RangeSelector.updateTimeScale', {
            message: /Updating.*scale/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Bar chart is re-rendered
        .expectMilestone('RangeSelector.rerenderBarChart', {
            message: /Re-rendering bar chart/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Brush is adjusted to new scale
        .expectMilestone('RangeSelector.adjustBrushToScale', {
            message: /Adjusting brush/i,
            category: LogCategory.VISUALIZATION
        })

        // 6. Range is preserved (if possible)
        .expectOptionalMilestone('RangeSelector.preserveRange', {
            message: /Preserving.*range/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Range selector reset pathway
 */
export function createRangeSelectorResetPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Reset is triggered
        .expectMilestone('RangeSelector.reset', {
            message: /Reset.*range selector/i,
            category: LogCategory.UI
        })

        // 2. Full time range is calculated
        .expectMilestone('RangeSelector.calculateFullRange', {
            message: /Calculating full range/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. Brush is set to full extent
        .expectMilestone('RangeSelector.setBrushToFullExtent', {
            message: /Setting brush.*full/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Labels are updated
        .expectMilestone('RangeSelector.updateLabels', {
            message: /Updating.*labels/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Viewport is reset
        .expectMilestone('RangeSelector.resetViewport', {
            message: /Reset.*viewport/i,
            category: LogCategory.VISUALIZATION
        })

        // 6. Timeline shows full range
        .expectMilestone('SimpleTimelineApp.showFullRange', {
            message: /Showing full range/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Range selector resize (window resize) pathway
 */
export function createRangeSelectorResizePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.RANGE_SELECTOR)
        // 1. Window resize is detected
        .expectMilestone('SimpleTimelineApp.handleResize', {
            message: /Handling resize/i,
            category: LogCategory.UI
        })

        // 2. Range selector dimensions are recalculated
        .expectMilestone('RangeSelector.recalculateDimensions', {
            message: /Recalculating dimensions/i,
            category: LogCategory.VISUALIZATION
        })

        // 3. SVG is resized
        .expectMilestone('RangeSelector.resizeSVG', {
            message: /Resizing SVG/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Scale is updated for new width
        .expectMilestone('RangeSelector.updateScaleForResize', {
            message: /Updating scale.*resize/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Bar chart is re-rendered
        .expectMilestone('RangeSelector.rerenderBarChart', {
            message: /Re-rendering bar chart/i,
            category: LogCategory.VISUALIZATION
        })

        // 6. Brush is repositioned
        .expectMilestone('RangeSelector.repositionBrush', {
            message: /Repositioning brush/i,
            category: LogCategory.VISUALIZATION
        });
}
