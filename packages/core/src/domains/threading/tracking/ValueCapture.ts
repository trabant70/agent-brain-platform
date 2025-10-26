/**
 * ValueCapture Utility
 *
 * Safely captures values with:
 * - Circular reference handling
 * - Privacy features (redact passwords, tokens, PII)
 * - Size/depth limits
 * - Type and shape capture
 */

import { ValueSnapshot, TypeCapture, ShapeCapture } from '../types';

/**
 * Value Capture Configuration
 */
export interface ValueCaptureConfig {
  // Size limits
  maxStringLength: number;        // Max string length before truncation
  maxArrayLength: number;         // Max array items before truncation
  maxObjectDepth: number;         // Max object nesting depth

  // Privacy
  redactPasswords: boolean;       // Redact password fields
  redactTokens: boolean;          // Redact token/key fields
  redactPII: boolean;             // Redact PII (email, phone, ssn)
  redactPatterns: RegExp[];       // Custom redaction patterns

  // Features
  captureTypes: boolean;          // Capture type information
  captureShapes: boolean;         // Capture shape information
  generatePreviews: boolean;      // Generate human-readable previews
}

/**
 * Default Configuration
 */
export const DEFAULT_VALUE_CAPTURE_CONFIG: ValueCaptureConfig = {
  maxStringLength: 1000,
  maxArrayLength: 100,
  maxObjectDepth: 5,
  redactPasswords: true,
  redactTokens: true,
  redactPII: false,
  redactPatterns: [],
  captureTypes: true,
  captureShapes: true,
  generatePreviews: true
};

/**
 * Sensitive field patterns
 */
const SENSITIVE_FIELD_PATTERNS = {
  password: /^(password|passwd|pwd|pass)$/i,
  token: /^(token|key|secret|apikey|api_key|auth|authorization)$/i,
  pii: /^(ssn|social_security|phone|email|address|credit_card|cc_number)$/i
};

/**
 * ValueCapture Utility
 */
export class ValueCapture {
  private config: ValueCaptureConfig;
  private circularRefs: WeakSet<object>;

  constructor(config?: Partial<ValueCaptureConfig>) {
    this.config = { ...DEFAULT_VALUE_CAPTURE_CONFIG, ...config };
    this.circularRefs = new WeakSet();
  }

  /**
   * Capture value snapshot
   */
  capture(value: any, fieldName?: string, depth: number = 0): ValueSnapshot {
    const timestamp = Date.now();

    // Check for redaction
    if (fieldName && this.shouldRedact(fieldName)) {
      return {
        value: '[REDACTED]',
        type: this.captureType(value),
        preview: '[REDACTED]',
        timestamp,
        redacted: true
      };
    }

    // Check for circular reference
    if (value !== null && typeof value === 'object') {
      if (this.circularRefs.has(value)) {
        return {
          value: '[Circular Reference]',
          type: this.captureType(value),
          preview: '[Circular]',
          timestamp
        };
      }
      this.circularRefs.add(value);
    }

    // Capture based on type
    const type = this.captureType(value);
    const shape = this.config.captureShapes && (type.isArray || this.isObject(value))
      ? this.captureShape(value, depth)
      : undefined;

    let capturedValue = value;
    let truncated = false;

    // Handle strings
    if (typeof value === 'string') {
      if (value.length > this.config.maxStringLength) {
        capturedValue = value.substring(0, this.config.maxStringLength) + '...';
        truncated = true;
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length > this.config.maxArrayLength) {
        capturedValue = value.slice(0, this.config.maxArrayLength);
        truncated = true;
      }

      // Deep capture array items if within depth limit
      if (depth < this.config.maxObjectDepth) {
        capturedValue = capturedValue.map((item: any, index: number) =>
          this.capture(item, `[${index}]`, depth + 1).value
        );
      }
    }

    // Handle objects
    if (this.isObject(value)) {
      if (depth >= this.config.maxObjectDepth) {
        capturedValue = '[Max Depth Reached]';
        truncated = true;
      } else {
        const captured: Record<string, any> = {};
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            captured[key] = this.capture(value[key], key, depth + 1).value;
          }
        }
        capturedValue = captured;
      }
    }

    const preview = this.config.generatePreviews
      ? this.generatePreview(value, type, shape)
      : undefined;

    const size = this.estimateSize(value);

    return {
      value: capturedValue,
      type,
      shape,
      preview,
      size,
      timestamp,
      truncated
    };
  }

  /**
   * Capture type information
   */
  private captureType(value: any): TypeCapture {
    const primitive = typeof value;
    const isNull = value === null;
    const isUndefined = value === undefined;
    const isArray = Array.isArray(value);
    const isPromise = value instanceof Promise;

    let constructor: string | undefined;
    let custom: string | undefined;

    if (value !== null && typeof value === 'object') {
      constructor = value.constructor?.name;

      // Check for custom types
      if (constructor && constructor !== 'Object' && constructor !== 'Array') {
        custom = constructor;
      }
    }

    return {
      primitive,
      constructor,
      custom,
      isArray,
      isPromise,
      isNull,
      isUndefined
    };
  }

  /**
   * Capture shape information
   */
  private captureShape(value: any, depth: number): ShapeCapture {
    if (Array.isArray(value)) {
      return {
        depth,
        arrayLength: value.length,
        itemType: this.inferArrayItemType(value)
      };
    }

    if (this.isObject(value)) {
      const keys = Object.keys(value);
      const structure = depth < this.config.maxObjectDepth
        ? this.captureStructure(value, depth)
        : undefined;

      return {
        keys,
        depth,
        structure
      };
    }

    return { depth };
  }

  /**
   * Capture nested structure
   */
  private captureStructure(obj: any, depth: number): Record<string, any> {
    if (depth >= this.config.maxObjectDepth) {
      return {};
    }

    const structure: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const type = typeof value;

        if (type === 'object' && value !== null) {
          if (Array.isArray(value)) {
            structure[key] = `Array<${this.inferArrayItemType(value)}>[${value.length}]`;
          } else {
            structure[key] = this.captureStructure(value, depth + 1);
          }
        } else {
          structure[key] = type;
        }
      }
    }

    return structure;
  }

  /**
   * Infer array item type
   */
  private inferArrayItemType(arr: any[]): string {
    if (arr.length === 0) return 'unknown';

    const firstType = typeof arr[0];
    const allSameType = arr.every(item => typeof item === firstType);

    if (allSameType) {
      if (firstType === 'object' && arr[0] !== null) {
        const constructorName = arr[0].constructor?.name;
        return constructorName || 'object';
      }
      return firstType;
    }

    return 'mixed';
  }

  /**
   * Generate human-readable preview
   */
  private generatePreview(value: any, type: TypeCapture, shape?: ShapeCapture): string {
    if (type.isNull) return 'null';
    if (type.isUndefined) return 'undefined';

    if (type.primitive === 'string') {
      const str = value as string;
      if (str.length > 50) {
        return `"${str.substring(0, 47)}..."`;
      }
      return `"${str}"`;
    }

    if (type.primitive === 'number') {
      return String(value);
    }

    if (type.primitive === 'boolean') {
      return String(value);
    }

    if (type.isArray) {
      const length = shape?.arrayLength || 0;
      const itemType = shape?.itemType || 'unknown';
      return `Array<${itemType}>[${length}]`;
    }

    if (type.primitive === 'object') {
      const keys = shape?.keys || [];
      if (keys.length === 0) return '{}';
      if (keys.length <= 3) {
        return `{ ${keys.join(', ')} }`;
      }
      return `{ ${keys.slice(0, 3).join(', ')}, ... (${keys.length} keys) }`;
    }

    if (type.isPromise) {
      return 'Promise<...>';
    }

    if (type.custom) {
      return `${type.custom} { ... }`;
    }

    return String(value);
  }

  /**
   * Estimate size in bytes
   */
  private estimateSize(value: any): number {
    const type = typeof value;

    if (value === null || value === undefined) return 0;
    if (type === 'boolean') return 4;
    if (type === 'number') return 8;
    if (type === 'string') return value.length * 2; // UTF-16

    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }

    if (type === 'object') {
      let size = 0;
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          size += key.length * 2; // Key size
          size += this.estimateSize(value[key]); // Value size
        }
      }
      return size;
    }

    return 0;
  }

  /**
   * Check if value should be redacted
   */
  private shouldRedact(fieldName: string): boolean {
    // Check password fields
    if (this.config.redactPasswords && SENSITIVE_FIELD_PATTERNS.password.test(fieldName)) {
      return true;
    }

    // Check token fields
    if (this.config.redactTokens && SENSITIVE_FIELD_PATTERNS.token.test(fieldName)) {
      return true;
    }

    // Check PII fields
    if (this.config.redactPII && SENSITIVE_FIELD_PATTERNS.pii.test(fieldName)) {
      return true;
    }

    // Check custom patterns
    for (const pattern of this.config.redactPatterns) {
      if (pattern.test(fieldName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Reset circular reference tracking
   * Call this between captures to avoid memory leaks
   */
  resetCircularTracking(): void {
    this.circularRefs = new WeakSet();
  }
}

/**
 * Global value capture instance
 */
let globalValueCapture: ValueCapture | undefined;

/**
 * Get global value capture instance
 */
export function getGlobalValueCapture(): ValueCapture {
  if (!globalValueCapture) {
    globalValueCapture = new ValueCapture();
  }
  return globalValueCapture;
}

/**
 * Set global value capture instance
 */
export function setGlobalValueCapture(capture: ValueCapture): void {
  globalValueCapture = capture;
}

/**
 * Quick capture function using global instance
 */
export function captureValue(value: any, fieldName?: string): ValueSnapshot {
  const capture = getGlobalValueCapture();
  const snapshot = capture.capture(value, fieldName);
  capture.resetCircularTracking();
  return snapshot;
}
