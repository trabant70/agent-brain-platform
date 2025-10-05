/**
 * Author information (normalized across providers)
 */
export interface Author {
  /** Unique identifier (email, username, or provider ID) */
  id: string;

  /** Display name */
  name: string;

  /** Email address (if available) */
  email?: string;

  /** Avatar URL (if available) */
  avatarUrl?: string;

  /** Provider-specific username */
  username?: string;
}
