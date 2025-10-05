/**
 * Base Registry Pattern
 *
 * Generic registry for managing pluggable components with health monitoring
 * and lifecycle management.
 */

export interface IRegistrable {
    id: string;
    name: string;
}

export interface IHealthCheckable {
    isHealthy(): Promise<boolean>;
}

export abstract class Registry<T extends IRegistrable> {
    protected items: Map<string, T> = new Map();

    /**
     * Register a new item
     */
    register(item: T): void {
        if (this.items.has(item.id)) {
            throw new Error(`Item with id "${item.id}" is already registered`);
        }
        this.items.set(item.id, item);
    }

    /**
     * Unregister an item
     */
    unregister(id: string): boolean {
        return this.items.delete(id);
    }

    /**
     * Get an item by ID
     */
    get(id: string): T | undefined {
        return this.items.get(id);
    }

    /**
     * Get all registered items
     */
    getAll(): T[] {
        return Array.from(this.items.values());
    }

    /**
     * Get all registered IDs
     */
    getIds(): string[] {
        return Array.from(this.items.keys());
    }

    /**
     * Check if an item is registered
     */
    has(id: string): boolean {
        return this.items.has(id);
    }

    /**
     * Clear all registered items
     */
    clear(): void {
        this.items.clear();
    }

    /**
     * Get count of registered items
     */
    get size(): number {
        return this.items.size;
    }
}
