/**
 * ThreadLog Decorator
 *
 * Method decorator that wraps functions with:
 * - ExecutionTracker for data capture
 * - Contract validation (input/output)
 * - Precondition/postcondition/invariant checking
 * - Complete execution trace logging
 *
 * This is separate from the ThreadLog class (../ThreadLog.ts) which handles runtime logging.
 * This decorator provides enhanced data contract validation.
 */

import { getThreadSpec, isEnhancedSpec } from './ThreadSpec';
import { ExecutionTracker, generateExecutionId, createTrackingProxy } from '../tracking/ExecutionTracker';
import { getInstance as getThreadLogger } from '../logging/ThreadLogger';
import { ContractViolation } from '../types';
import { getGlobalContractValidator } from '../validation/ContractValidator';
import { ContractExpectations, ContractProductions } from '../contracts';

/**
 * ThreadLog Decorator
 *
 * @example
 * ```typescript
 * @ThreadLog('DATA_FLOW', 'CACHE')
 * async getUser(id: string): Promise<User> {
 *   // Implementation
 * }
 * ```
 */
export function ThreadLog(...threads: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    // Check if method is async
    const isAsync = originalMethod.constructor.name === 'AsyncFunction' ||
                    originalMethod.toString().includes('async ');

    descriptor.value = async function (...args: any[]) {
      const className = target.constructor?.name || 'Anonymous';
      const context = `${className}.${propertyKey}`;

      // Get spec for this context
      const spec = getThreadSpec(context);

      // Skip if no spec or not enhanced
      if (!spec || !isEnhancedSpec(spec)) {
        // Fall back to original method
        return originalMethod.apply(this, args);
      }

      // Generate execution ID
      const executionId = generateExecutionId();

      // Create tracker
      const tracker = new ExecutionTracker(executionId, context, spec);

      // ENTRY: Capture state
      tracker.captureEntry({
        args,
        thisContext: this,
        timestamp: Date.now(),
        threads
      });

      // Validate input contracts (Phase 3 - not yet implemented)
      if (spec.expects) {
        const violations = await validateInputContracts(args, spec.expects, context);
        violations.forEach(v => tracker.logContractViolation(v));
      }

      // Check preconditions (Phase 3 - not yet implemented)
      if (spec.expects?.preconditions) {
        const violations = await checkPreconditions(
          spec.expects.preconditions,
          args,
          this,
          context
        );
        violations.forEach(v => tracker.logContractViolation(v));
      }

      try {
        // Execute with tracking proxy to capture mutations
        const proxyContext = createTrackingProxy(this, tracker);
        const result = isAsync
          ? await originalMethod.apply(proxyContext, args)
          : originalMethod.apply(proxyContext, args);

        // EXIT: Capture result
        tracker.captureExit({
          result,
          timestamp: Date.now(),
          mutations: tracker.getMutations()
        });

        // Validate output contracts
        if (spec.produces) {
          const violations = await validateOutputContracts(result, args, this, spec.produces, context);
          violations.forEach(v => tracker.logContractViolation(v));
        }

        // Check postconditions (Phase 3 - not yet implemented)
        if (spec.produces?.postconditions) {
          const violations = await checkPostconditions(
            spec.produces.postconditions,
            result,
            args,
            this,
            context
          );
          violations.forEach(v => tracker.logContractViolation(v));
        }

        // Check invariants (Phase 3 - not yet implemented)
        if (spec.invariants) {
          const violations = await checkInvariants(
            spec.invariants,
            result,
            args,
            this,
            context
          );
          violations.forEach(v => tracker.logContractViolation(v));
        }

        // Log complete trace to ThreadLogger
        const trace = tracker.getCompleteTrace();
        getThreadLogger().log({
          type: 'execution-trace',
          executionId,
          context,
          threads,
          trace,
          hasViolations: tracker.hasViolations(),
          summary: tracker.getExecutionSummary(),
          timestamp: Date.now()
        });

        return result;
      } catch (error) {
        // Capture error state
        tracker.captureError(error as Error, this);

        // Log error trace
        const trace = tracker.getCompleteTrace();
        getThreadLogger().log({
          type: 'execution-error',
          executionId,
          context,
          threads,
          trace,
          error: {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
          },
          summary: tracker.getExecutionSummary(),
          timestamp: Date.now()
        });

        // Re-throw error
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Validate input contracts
 */
async function validateInputContracts(
  args: any[],
  expects: ContractExpectations,
  context: string
): Promise<ContractViolation[]> {
  const validator = getGlobalContractValidator();
  const result = validator.validateInputs(args, expects, context);
  return result.violations;
}

/**
 * Validate output contracts
 */
async function validateOutputContracts(
  result: any,
  args: any[],
  thisContext: any,
  produces: ContractProductions,
  context: string
): Promise<ContractViolation[]> {
  const validator = getGlobalContractValidator();
  const validationResult = validator.validateOutputs(result, args, thisContext, produces, context);
  return validationResult.violations;
}

/**
 * Check preconditions
 */
async function checkPreconditions(
  preconditions: string[],
  args: any[],
  thisContext: any,
  context: string
): Promise<ContractViolation[]> {
  const validator = getGlobalContractValidator();
  const data = { args, this: thisContext };
  const result = validator.validateInvariants(preconditions, data, `${context}.preconditions`);
  return result.violations;
}

/**
 * Check postconditions
 */
async function checkPostconditions(
  postconditions: string[],
  result: any,
  args: any[],
  thisContext: any,
  context: string
): Promise<ContractViolation[]> {
  const validator = getGlobalContractValidator();
  const data = { args, result, this: thisContext };
  const validationResult = validator.validateInvariants(postconditions, data, `${context}.postconditions`);
  return validationResult.violations;
}

/**
 * Check invariants
 */
async function checkInvariants(
  invariants: string[],
  result: any,
  args: any[],
  thisContext: any,
  context: string
): Promise<ContractViolation[]> {
  const validator = getGlobalContractValidator();
  const data = { args, result, this: thisContext };
  const validationResult = validator.validateInvariants(invariants, data, `${context}.invariants`);
  return validationResult.violations;
}
