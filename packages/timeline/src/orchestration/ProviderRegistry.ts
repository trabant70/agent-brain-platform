/**
 * Provider Registry - Simplified Plugin Management
 *
 * Manages discovery, loading, and lifecycle of data providers
 * Updated to work with CanonicalEvent-based providers
 */

import {
  CanonicalEvent,
  ProviderContext,
  ProviderCapabilities,
  ProviderConfig
} from '../core/CanonicalEvent';

/**
 * Simplified data provider interface
 * Providers output CanonicalEvent[] directly
 */
export interface IDataProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: ProviderCapabilities;

  initialize(config: ProviderConfig): Promise<void>;
  fetchEvents(context: ProviderContext): Promise<CanonicalEvent[]>;
  isHealthy(): Promise<boolean>;
  dispose(): Promise<void>;
}

export interface IProviderHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  error?: Error;
}

export class ProviderRegistry {
  private providers = new Map<string, IDataProvider>();
  private configurations = new Map<string, ProviderConfig>();
  private healthStatus = new Map<string, IProviderHealthStatus>();
  private loadOrder: string[] = [];

  /**
   * Register a data provider
   */
  async registerProvider(provider: IDataProvider, config: ProviderConfig): Promise<void> {
    try {
      console.log(`ProviderRegistry: Registering provider: ${provider.id} (${provider.name})`);

      // Validate provider
      this.validateProvider(provider);

      // Initialize provider with configuration
      await provider.initialize(config);

      // Store provider and config
      this.providers.set(provider.id, provider);
      this.configurations.set(provider.id, config);
      this.loadOrder.push(provider.id);

      // Initial health check
      await this.updateProviderHealth(provider.id);

      console.log(`ProviderRegistry: Successfully registered provider: ${provider.id}`);
    } catch (error) {
      console.error(`ProviderRegistry: Failed to register provider ${provider.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a data provider
   */
  async unregisterProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      console.log(`ProviderRegistry: Unregistering provider: ${providerId}`);

      // Dispose provider resources
      await provider.dispose();

      // Remove from registry
      this.providers.delete(providerId);
      this.configurations.delete(providerId);
      this.healthStatus.delete(providerId);
      this.loadOrder = this.loadOrder.filter(id => id !== providerId);

      console.log(`ProviderRegistry: Successfully unregistered provider: ${providerId}`);
    } catch (error) {
      console.error(`ProviderRegistry: Failed to unregister provider ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific provider
   */
  getProvider(providerId: string): IDataProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IDataProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): IDataProvider[] {
    return Array.from(this.providers.entries())
      .filter(([id]) => this.configurations.get(id)?.enabled)
      .map(([, provider]) => provider);
  }

  /**
   * Get healthy providers (enabled + healthy)
   */
  getHealthyProviders(): IDataProvider[] {
    return Array.from(this.providers.entries())
      .filter(([id]) => {
        const config = this.configurations.get(id);
        const health = this.healthStatus.get(id);
        return config?.enabled && health?.isHealthy;
      })
      .map(([, provider]) => provider);
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    const config = this.configurations.get(providerId);
    if (!config) {
      throw new Error(`Provider configuration not found: ${providerId}`);
    }

    console.log(`ProviderRegistry: Setting provider ${providerId} enabled=${enabled}`);
    config.enabled = enabled;
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerId: string): boolean {
    const config = this.configurations.get(providerId);
    return config?.enabled ?? false;
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerId: string): IProviderHealthStatus | undefined {
    return this.healthStatus.get(providerId);
  }

  /**
   * Update provider health status
   */
  private async updateProviderHealth(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return;
    }

    try {
      const isHealthy = await provider.isHealthy();
      this.healthStatus.set(providerId, {
        isHealthy,
        lastCheck: new Date(),
        error: undefined
      });
    } catch (error) {
      this.healthStatus.set(providerId, {
        isHealthy: false,
        lastCheck: new Date(),
        error: error as Error
      });
    }
  }

  /**
   * Refresh health status for all providers
   */
  async refreshHealth(): Promise<void> {
    const promises = Array.from(this.providers.keys()).map(id =>
      this.updateProviderHealth(id)
    );
    await Promise.all(promises);
  }

  /**
   * Validate provider structure
   */
  private validateProvider(provider: IDataProvider): void {
    if (!provider.id || typeof provider.id !== 'string') {
      throw new Error('Provider must have a valid id');
    }

    if (!provider.name || typeof provider.name !== 'string') {
      throw new Error('Provider must have a valid name');
    }

    if (!provider.capabilities) {
      throw new Error('Provider must define capabilities');
    }

    if (typeof provider.initialize !== 'function') {
      throw new Error('Provider must implement initialize()');
    }

    if (typeof provider.fetchEvents !== 'function') {
      throw new Error('Provider must implement fetchEvents()');
    }

    if (typeof provider.isHealthy !== 'function') {
      throw new Error('Provider must implement isHealthy()');
    }

    if (typeof provider.dispose !== 'function') {
      throw new Error('Provider must implement dispose()');
    }
  }
}
