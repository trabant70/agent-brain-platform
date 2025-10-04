/**
 * Feature Flag System
 *
 * Manages feature enablement via token-based validation (nagware style).
 * This is NOT a security mechanism - just a simple enablement flow.
 */

export enum Feature {
  GITHUB_PROVIDER = 'github-provider',
  JIRA_PROVIDER = 'jira-provider',
  AGENT_BRAIN = 'agent-brain',
  ADVANCED_ANALYTICS = 'advanced-analytics'
}

export interface FeatureFlagConfig {
  token?: string;
  enableAll?: boolean;
}

/**
 * Token Validator Interface
 * Stand-in for future real validation logic
 */
export interface ITokenValidator {
  /**
   * Validate a token for a specific feature
   * @param token - Token string
   * @param feature - Feature to validate
   * @returns true if token enables the feature
   */
  validateToken(token: string, feature: Feature): Promise<boolean>;

  /**
   * Check if a feature is enabled with current configuration
   * @param feature - Feature to check
   * @returns true if feature is enabled
   */
  isFeatureEnabled(feature: Feature): Promise<boolean>;
}

/**
 * Default Token Validator
 *
 * For now, uses a default token that enables everything.
 * Future: Replace with real validation logic (API call, license check, etc.)
 */
export class DefaultTokenValidator implements ITokenValidator {
  // Default token that enables all features
  private static readonly DEFAULT_TOKEN = 'ENABLE_ALL_FEATURES_v1';

  // Current token (defaults to ENABLE_ALL)
  private currentToken: string;

  constructor(config?: FeatureFlagConfig) {
    if (config?.enableAll) {
      this.currentToken = DefaultTokenValidator.DEFAULT_TOKEN;
    } else {
      this.currentToken = config?.token || DefaultTokenValidator.DEFAULT_TOKEN;
    }
  }

  /**
   * Validate a token for a specific feature
   */
  async validateToken(token: string, feature: Feature): Promise<boolean> {
    // For now, simple string comparison
    // Future: Add API validation, expiration checks, feature-specific logic

    if (token === DefaultTokenValidator.DEFAULT_TOKEN) {
      // Default token enables everything
      return true;
    }

    // Future: Feature-specific token validation
    // Example: "GITHUB_PROVIDER_TOKEN_xyz" enables only GitHub provider
    const featurePrefix = `${feature.toUpperCase()}_TOKEN_`;
    if (token.startsWith(featurePrefix)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a feature is enabled with current configuration
   */
  async isFeatureEnabled(feature: Feature): Promise<boolean> {
    return this.validateToken(this.currentToken, feature);
  }

  /**
   * Update the current token
   */
  setToken(token: string): void {
    this.currentToken = token;
  }

  /**
   * Get the current token (for debugging)
   */
  getToken(): string {
    return this.currentToken;
  }

  /**
   * Enable all features (for testing/development)
   */
  enableAll(): void {
    this.currentToken = DefaultTokenValidator.DEFAULT_TOKEN;
  }
}

/**
 * Global Feature Flag Manager
 *
 * Singleton that manages feature enablement across the extension.
 */
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private tokenValidator: ITokenValidator;
  private enabledFeatures: Map<Feature, boolean> = new Map();

  private constructor(config?: FeatureFlagConfig) {
    this.tokenValidator = new DefaultTokenValidator(config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: FeatureFlagConfig): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager(config);
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    FeatureFlagManager.instance = null as any;
  }

  /**
   * Check if a feature is enabled
   * Uses cached result if available
   */
  async isFeatureEnabled(feature: Feature): Promise<boolean> {
    // Check cache first
    if (this.enabledFeatures.has(feature)) {
      return this.enabledFeatures.get(feature)!;
    }

    // Validate with token validator
    const enabled = await this.tokenValidator.isFeatureEnabled(feature);

    // Cache result
    this.enabledFeatures.set(feature, enabled);

    return enabled;
  }

  /**
   * Refresh feature status (clear cache and re-validate)
   */
  async refreshFeatureStatus(feature: Feature): Promise<boolean> {
    this.enabledFeatures.delete(feature);
    return this.isFeatureEnabled(feature);
  }

  /**
   * Set custom token validator (for testing or advanced use cases)
   */
  setTokenValidator(validator: ITokenValidator): void {
    this.tokenValidator = validator;
    this.enabledFeatures.clear(); // Clear cache when validator changes
  }

  /**
   * Get current token validator
   */
  getTokenValidator(): ITokenValidator {
    return this.tokenValidator;
  }

  /**
   * Enable all features (development mode)
   */
  enableAllFeatures(): void {
    if (this.tokenValidator instanceof DefaultTokenValidator) {
      this.tokenValidator.enableAll();
      this.enabledFeatures.clear(); // Clear cache
    }
  }
}

/**
 * Convenience function to check if a feature is enabled
 */
export async function isFeatureEnabled(feature: Feature): Promise<boolean> {
  const manager = FeatureFlagManager.getInstance();
  return manager.isFeatureEnabled(feature);
}

/**
 * Decorator to guard methods with feature flags
 *
 * Usage:
 * ```typescript
 * class MyProvider {
 *   @requireFeature(Feature.GITHUB_PROVIDER)
 *   async fetchEvents() { ... }
 * }
 * ```
 */
export function requireFeature(feature: Feature) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const enabled = await isFeatureEnabled(feature);
      if (!enabled) {
        throw new Error(
          `Feature '${feature}' is not enabled. Please configure a valid token.`
        );
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
