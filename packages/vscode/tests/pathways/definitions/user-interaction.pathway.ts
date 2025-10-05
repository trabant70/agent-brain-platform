/**
 * USER_INTERACTION Pathway Definition
 *
 * Flow: User Event → Handler → State Update → UI Update → Visual Feedback
 *
 * This pathway tracks user interaction flows including clicks, hovers,
 * drags, and keyboard events.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Event click interaction pathway
 */
export function createEventClickPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Click event is captured
        .expectMilestone('InteractionHandler.handleClick', {
            message: /Click.*event/i,
            category: LogCategory.UI
        })

        // 2. Event data is retrieved
        .expectMilestone('InteractionHandler.getEventData', {
            message: /Getting event data/i,
            category: LogCategory.UI
        })

        // 3. Popup is prepared
        .expectMilestone('PopupController.preparePopup', {
            message: /Preparing popup/i,
            category: LogCategory.UI
        })

        // 4. Popup content is rendered
        .expectMilestone('PopupController.renderContent', {
            message: /Rendering popup content/i,
            category: LogCategory.UI
        })

        // 5. Popup is shown
        .expectMilestone('PopupController.showPopup', {
            message: /Showing popup|Popup displayed/i,
            category: LogCategory.UI
        });
}

/**
 * Event hover interaction pathway
 */
export function createEventHoverPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Hover event is captured
        .expectMilestone('InteractionHandler.handleHover', {
            message: /Hover.*event/i,
            category: LogCategory.UI
        })

        // 2. Tooltip data is prepared
        .expectMilestone('TooltipController.prepareTooltip', {
            message: /Preparing tooltip/i,
            category: LogCategory.UI
        })

        // 3. Tooltip is positioned
        .expectMilestone('TooltipController.positionTooltip', {
            message: /Positioning tooltip/i,
            category: LogCategory.UI
        })

        // 4. Tooltip is shown
        .expectMilestone('TooltipController.showTooltip', {
            message: /Showing tooltip/i,
            category: LogCategory.UI
        });
}

/**
 * Filter toggle interaction pathway
 */
export function createFilterTogglePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Toggle event is captured
        .expectMilestone('FilterController.handleToggle', {
            message: /Toggle.*filter/i,
            category: LogCategory.UI
        })

        // 2. Filter state is updated
        .expectMilestone('FilterController.updateFilterState', {
            message: /Updating filter state/i,
            category: LogCategory.FILTERING
        })

        // 3. UI reflects new state
        .expectMilestone('FilterController.updateUI', {
            message: /Updating filter UI/i,
            category: LogCategory.UI
        })

        // 4. Data is filtered
        .expectMilestone('FilterController.applyFilters', {
            message: /Applying filters/i,
            category: LogCategory.FILTERING
        });
}

/**
 * Legend item click interaction pathway
 */
export function createLegendClickPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Legend click is captured
        .expectMilestone('LegendRenderer.handleClick', {
            message: /Legend.*click/i,
            category: LogCategory.UI
        })

        // 2. Event type filter is toggled
        .expectMilestone('FilterController.toggleEventType', {
            message: /Toggle.*event type/i,
            category: LogCategory.FILTERING
        })

        // 3. Legend item visual state updates
        .expectMilestone('LegendRenderer.updateItemState', {
            message: /Updating legend.*state/i,
            category: LogCategory.UI
        })

        // 4. Timeline re-renders
        .expectMilestone('SimpleTimelineApp.rerender', {
            message: /Re-rendering/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Zoom/Pan interaction pathway
 */
export function createZoomPanPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Zoom/pan gesture is captured
        .expectMilestone('InteractionHandler.handleZoom', {
            message: /Zoom.*event/i,
            category: LogCategory.UI
        })

        // 2. Transform is calculated
        .expectMilestone('InteractionHandler.calculateTransform', {
            message: /Calculating.*transform/i,
            category: LogCategory.UI
        })

        // 3. Scale is updated
        .expectMilestone('D3TimelineRenderer.updateScale', {
            message: /Updating scale/i,
            category: LogCategory.VISUALIZATION
        })

        // 4. Viewport is updated
        .expectMilestone('D3TimelineRenderer.updateViewport', {
            message: /Updating viewport/i,
            category: LogCategory.VISUALIZATION
        })

        // 5. Range selector reflects change
        .expectOptionalMilestone('RangeSelector.updateSelection', {
            message: /Updating.*selection/i,
            category: LogCategory.VISUALIZATION
        });
}

/**
 * Keyboard navigation pathway
 */
export function createKeyboardNavPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Keyboard event is captured
        .expectMilestone('InteractionHandler.handleKeyboard', {
            message: /Keyboard.*event/i,
            category: LogCategory.UI
        })

        // 2. Command is interpreted
        .expectMilestone('InteractionHandler.interpretCommand', {
            message: /Interpreting.*command/i,
            category: LogCategory.UI
        })

        // 3. Action is executed
        .expectMilestone('InteractionHandler.executeCommand', {
            message: /Executing.*command/i,
            category: LogCategory.UI
        })

        // 4. Visual feedback is provided
        .expectMilestone('InteractionHandler.provideFeedback', {
            message: /Providing.*feedback/i,
            category: LogCategory.UI
        });
}

/**
 * Context menu interaction pathway
 */
export function createContextMenuPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.USER_INTERACTION)
        // 1. Right-click is captured
        .expectMilestone('InteractionHandler.handleContextMenu', {
            message: /Context menu.*event/i,
            category: LogCategory.UI
        })

        // 2. Menu items are prepared
        .expectMilestone('ContextController.prepareMenuItems', {
            message: /Preparing menu items/i,
            category: LogCategory.UI
        })

        // 3. Menu is shown
        .expectMilestone('ContextController.showMenu', {
            message: /Showing context menu/i,
            category: LogCategory.UI
        })

        // 4. Menu item is selected
        .expectMilestone('ContextController.handleSelection', {
            message: /Menu.*selected/i,
            category: LogCategory.UI
        })

        // 5. Action is executed
        .expectMilestone('ContextController.executeAction', {
            message: /Executing.*action/i,
            category: LogCategory.UI
        });
}
