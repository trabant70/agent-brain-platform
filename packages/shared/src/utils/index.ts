/**
 * Shared utility functions for Agent Brain Platform
 */

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Safely parse a date from various formats
 */
export function parseDate(value: string | Date | number): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  return new Date(value);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  if (format === 'iso') {
    return date.toISOString();
  }
  if (format === 'long') {
    return date.toLocaleString();
  }
  return date.toLocaleDateString();
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are equal (shallow comparison)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}
