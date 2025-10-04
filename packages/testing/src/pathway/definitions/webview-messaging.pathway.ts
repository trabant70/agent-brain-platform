/**
 * WEBVIEW_MESSAGING Pathway Definition
 *
 * Flow: Extension ↔ Webview postMessage Communication
 *
 * This pathway tracks bidirectional messaging between the extension host
 * and the webview, including data transfer, command execution, and responses.
 */

import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { LogPathway, LogCategory } from '../../../src/utils/Logger';

/**
 * Extension → Webview data message pathway
 */
export function createExtensionToWebviewPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Extension prepares message
        .expectMilestone('extension.prepareMessage', {
            message: /Preparing.*message.*webview/i,
            category: LogCategory.WEBVIEW
        })

        // 2. Data is serialized
        .expectMilestone('extension.serializeData', {
            message: /Serializing.*data/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Message is posted
        .expectMilestone('extension.postMessage', {
            message: /Posting message.*webview/i,
            category: LogCategory.WEBVIEW
        })

        // 4. Webview receives message
        .expectMilestone('webview.receiveMessage', {
            message: /Received message.*extension/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Message is processed
        .expectMilestone('webview.processMessage', {
            message: /Processing message/i,
            category: LogCategory.WEBVIEW
        })

        // 6. Action is dispatched
        .expectMilestone('webview.dispatchAction', {
            message: /Dispatching.*action/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Webview → Extension request message pathway
 */
export function createWebviewToExtensionPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Webview prepares request
        .expectMilestone('webview.prepareRequest', {
            message: /Preparing request.*extension/i,
            category: LogCategory.WEBVIEW
        })

        // 2. Request is posted
        .expectMilestone('webview.postMessage', {
            message: /Posting.*message.*extension/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Extension receives message
        .expectMilestone('extension.receiveMessage', {
            message: /Received message.*webview/i,
            category: LogCategory.WEBVIEW
        })

        // 4. Request is validated
        .expectMilestone('extension.validateRequest', {
            message: /Validating.*request/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Request is processed
        .expectMilestone('extension.processRequest', {
            message: /Processing.*request/i,
            category: LogCategory.WEBVIEW
        })

        // 6. Response is prepared
        .expectMilestone('extension.prepareResponse', {
            message: /Preparing response/i,
            category: LogCategory.WEBVIEW
        })

        // 7. Response is sent back
        .expectMilestone('extension.sendResponse', {
            message: /Sending response.*webview/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Initial data request pathway (webview startup)
 */
export function createInitialDataRequestPathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Webview requests initial data
        .expectMilestone('webview.requestData', {
            message: /Requesting initial data/i,
            category: LogCategory.WEBVIEW
        })

        // 2. Extension receives request
        .expectMilestone('extension.handleDataRequest', {
            message: /Handling data request/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Data is fetched
        .expectMilestone('extension.fetchData', {
            message: /Fetching.*data/i,
            category: LogCategory.DATA
        })

        // 4. Data is sent to webview
        .expectMilestone('extension.sendData', {
            message: /Sending data.*webview/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Webview receives data
        .expectMilestone('webview.handleData', {
            message: /Handling.*data/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Filter update message pathway
 */
export function createFilterUpdateMessagePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Webview posts filter update
        .expectMilestone('webview.postFilterUpdate', {
            message: /Posting filter update/i,
            category: LogCategory.WEBVIEW
        })

        // 2. Extension receives filter update
        .expectMilestone('extension.handleFilterUpdate', {
            message: /Handling filter update/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Filters are applied
        .expectMilestone('extension.applyFilters', {
            message: /Applying filters/i,
            category: LogCategory.FILTERING
        })

        // 4. Filtered data is sent back
        .expectMilestone('extension.sendFilteredData', {
            message: /Sending filtered data/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Webview receives filtered data
        .expectMilestone('webview.handleFilteredData', {
            message: /Handling filtered data/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Configuration change message pathway
 */
export function createConfigChangeMessagePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Extension detects config change
        .expectMilestone('extension.onConfigChange', {
            message: /Configuration changed/i,
            category: LogCategory.EXTENSION
        })

        // 2. Config is prepared for webview
        .expectMilestone('extension.prepareConfigUpdate', {
            message: /Preparing config update/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Config message is sent
        .expectMilestone('extension.sendConfigUpdate', {
            message: /Sending config update/i,
            category: LogCategory.WEBVIEW
        })

        // 4. Webview receives config
        .expectMilestone('webview.handleConfigUpdate', {
            message: /Handling config update/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Config is applied
        .expectMilestone('webview.applyConfig', {
            message: /Applying.*config/i,
            category: LogCategory.WEBVIEW
        });
}

/**
 * Error message pathway (extension → webview)
 */
export function createErrorMessagePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Extension encounters error
        .expectMilestone('extension.handleError', {
            message: /Handling error/i,
            category: LogCategory.EXTENSION
        })

        // 2. Error message is prepared
        .expectMilestone('extension.prepareErrorMessage', {
            message: /Preparing error message/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Error is sent to webview
        .expectMilestone('extension.sendError', {
            message: /Sending error.*webview/i,
            category: LogCategory.WEBVIEW
        })

        // 4. Webview receives error
        .expectMilestone('webview.handleError', {
            message: /Handling error.*extension/i,
            category: LogCategory.WEBVIEW
        })

        // 5. Error is displayed
        .expectMilestone('webview.displayError', {
            message: /Displaying error/i,
            category: LogCategory.UI
        });
}

/**
 * Command execution message pathway
 */
export function createCommandMessagePathway(): PathwayAsserter {
    return new PathwayAsserter(LogPathway.WEBVIEW_MESSAGING)
        // 1. Webview requests command execution
        .expectMilestone('webview.sendCommand', {
            message: /Sending command/i,
            category: LogCategory.WEBVIEW
        })

        // 2. Extension receives command
        .expectMilestone('extension.receiveCommand', {
            message: /Received command/i,
            category: LogCategory.WEBVIEW
        })

        // 3. Command is validated
        .expectMilestone('extension.validateCommand', {
            message: /Validating command/i,
            category: LogCategory.EXTENSION
        })

        // 4. Command is executed
        .expectMilestone('extension.executeCommand', {
            message: /Executing command/i,
            category: LogCategory.EXTENSION
        })

        // 5. Result is sent back
        .expectMilestone('extension.sendCommandResult', {
            message: /Sending command result/i,
            category: LogCategory.WEBVIEW
        })

        // 6. Webview receives result
        .expectMilestone('webview.handleCommandResult', {
            message: /Handling command result/i,
            category: LogCategory.WEBVIEW
        });
}
