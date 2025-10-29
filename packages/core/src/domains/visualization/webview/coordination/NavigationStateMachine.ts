/**
 * Navigation State Machine
 * Formal state machine for visualization navigation
 *
 * States:
 * - overview: Top-level category view
 * - category-detail: Specific category drill-down
 * - file-detail: Individual file analysis
 *
 * Transitions:
 * - overview → category-detail: selectCategory(categoryId)
 * - overview → file-detail: selectFile(filePath)
 * - category-detail → file-detail: selectFile(filePath)
 * - category-detail → overview: back()
 * - file-detail → category-detail: back()
 * - file-detail → overview: backToOverview()
 * - any → overview: reset()
 */

export type NavigationState = 'overview' | 'category-detail' | 'file-detail';

export type NavigationAction =
  | { type: 'SELECT_CATEGORY'; categoryId: string; categoryName: string }
  | { type: 'SELECT_FILE'; filePath: string; categoryId?: string }
  | { type: 'BACK' }
  | { type: 'BACK_TO_OVERVIEW' }
  | { type: 'RESET' }
  | { type: 'NAVIGATE_TO_BREADCRUMB'; index: number };

export interface StateContext {
  categoryId?: string;
  categoryName?: string;
  filePath?: string;
  history: NavigationState[];
}

export interface StateTransition {
  from: NavigationState | NavigationState[];
  to: NavigationState;
  action: NavigationAction['type'];
  guard?: (context: StateContext, action: NavigationAction) => boolean;
  effect?: (context: StateContext, action: NavigationAction) => void;
}

/**
 * Navigation State Machine
 */
export class NavigationStateMachine {
  private currentState: NavigationState;
  private context: StateContext;
  private transitions: StateTransition[];
  private listeners: Set<(state: NavigationState, context: StateContext) => void> = new Set();

  constructor(initialState: NavigationState = 'overview') {
    this.currentState = initialState;
    this.context = {
      history: [initialState]
    };
    this.transitions = this.defineTransitions();
  }

  /**
   * Define state transitions
   */
  private defineTransitions(): StateTransition[] {
    return [
      // Overview → Category Detail
      {
        from: 'overview',
        to: 'category-detail',
        action: 'SELECT_CATEGORY',
        effect: (context, action) => {
          if (action.type === 'SELECT_CATEGORY') {
            context.categoryId = action.categoryId;
            context.categoryName = action.categoryName;
            context.filePath = undefined;
          }
        }
      },

      // Overview → File Detail
      {
        from: 'overview',
        to: 'file-detail',
        action: 'SELECT_FILE',
        effect: (context, action) => {
          if (action.type === 'SELECT_FILE') {
            context.filePath = action.filePath;
            context.categoryId = action.categoryId;
          }
        }
      },

      // Category Detail → File Detail
      {
        from: 'category-detail',
        to: 'file-detail',
        action: 'SELECT_FILE',
        effect: (context, action) => {
          if (action.type === 'SELECT_FILE') {
            context.filePath = action.filePath;
            // Preserve categoryId if not provided
            if (action.categoryId) {
              context.categoryId = action.categoryId;
            }
          }
        }
      },

      // Category Detail → Overview (back)
      {
        from: 'category-detail',
        to: 'overview',
        action: 'BACK',
        effect: (context) => {
          context.categoryId = undefined;
          context.categoryName = undefined;
          context.filePath = undefined;
        }
      },

      // File Detail → Category Detail (back)
      {
        from: 'file-detail',
        to: 'category-detail',
        action: 'BACK',
        guard: (context) => !!context.categoryId,
        effect: (context) => {
          context.filePath = undefined;
        }
      },

      // File Detail → Overview (back when no category)
      {
        from: 'file-detail',
        to: 'overview',
        action: 'BACK',
        guard: (context) => !context.categoryId,
        effect: (context) => {
          context.filePath = undefined;
          context.categoryId = undefined;
          context.categoryName = undefined;
        }
      },

      // Any → Overview (back to overview)
      {
        from: ['category-detail', 'file-detail'],
        to: 'overview',
        action: 'BACK_TO_OVERVIEW',
        effect: (context) => {
          context.categoryId = undefined;
          context.categoryName = undefined;
          context.filePath = undefined;
        }
      },

      // Any → Overview (reset)
      {
        from: ['overview', 'category-detail', 'file-detail'],
        to: 'overview',
        action: 'RESET',
        effect: (context) => {
          context.categoryId = undefined;
          context.categoryName = undefined;
          context.filePath = undefined;
          context.history = ['overview'];
        }
      }
    ];
  }

  /**
   * Dispatch an action to trigger state transition
   */
  dispatch(action: NavigationAction): boolean {
    const validTransitions = this.transitions.filter(transition => {
      const fromMatch = Array.isArray(transition.from)
        ? transition.from.includes(this.currentState)
        : transition.from === this.currentState;

      const actionMatch = transition.action === action.type;

      const guardPass = !transition.guard || transition.guard(this.context, action);

      return fromMatch && actionMatch && guardPass;
    });

    if (validTransitions.length === 0) {
      console.warn(
        `No valid transition from state "${this.currentState}" with action "${action.type}"`
      );
      return false;
    }

    // Take first matching transition
    const transition = validTransitions[0];

    // Apply effect
    if (transition.effect) {
      transition.effect(this.context, action);
    }

    // Update state
    const previousState = this.currentState;
    this.currentState = transition.to;

    // Update history
    this.context.history.push(this.currentState);

    // Notify listeners
    this.notifyListeners();

    console.log(
      `State transition: ${previousState} → ${this.currentState}`,
      { action: action.type, context: this.context }
    );

    return true;
  }

  /**
   * Select category (overview → category-detail)
   */
  selectCategory(categoryId: string, categoryName: string): boolean {
    return this.dispatch({
      type: 'SELECT_CATEGORY',
      categoryId,
      categoryName
    });
  }

  /**
   * Select file (any → file-detail)
   */
  selectFile(filePath: string, categoryId?: string): boolean {
    return this.dispatch({
      type: 'SELECT_FILE',
      filePath,
      categoryId
    });
  }

  /**
   * Navigate back
   */
  back(): boolean {
    return this.dispatch({ type: 'BACK' });
  }

  /**
   * Navigate back to overview
   */
  backToOverview(): boolean {
    return this.dispatch({ type: 'BACK_TO_OVERVIEW' });
  }

  /**
   * Reset to initial state
   */
  reset(): boolean {
    return this.dispatch({ type: 'RESET' });
  }

  /**
   * Get current state
   */
  getState(): NavigationState {
    return this.currentState;
  }

  /**
   * Get current context
   */
  getContext(): Readonly<StateContext> {
    return { ...this.context };
  }

  /**
   * Get history
   */
  getHistory(): NavigationState[] {
    return [...this.context.history];
  }

  /**
   * Can navigate back?
   */
  canGoBack(): boolean {
    return this.context.history.length > 1;
  }

  /**
   * Get previous state
   */
  getPreviousState(): NavigationState | null {
    if (this.context.history.length < 2) return null;
    return this.context.history[this.context.history.length - 2];
  }

  /**
   * Check if in specific state
   */
  isInState(state: NavigationState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if transition is valid
   */
  canTransition(action: NavigationAction): boolean {
    const validTransitions = this.transitions.filter(transition => {
      const fromMatch = Array.isArray(transition.from)
        ? transition.from.includes(this.currentState)
        : transition.from === this.currentState;

      const actionMatch = transition.action === action.type;

      const guardPass = !transition.guard || transition.guard(this.context, action);

      return fromMatch && actionMatch && guardPass;
    });

    return validTransitions.length > 0;
  }

  /**
   * Get valid actions for current state
   */
  getValidActions(): NavigationAction['type'][] {
    const validActions = new Set<NavigationAction['type']>();

    this.transitions.forEach(transition => {
      const fromMatch = Array.isArray(transition.from)
        ? transition.from.includes(this.currentState)
        : transition.from === this.currentState;

      if (fromMatch) {
        validActions.add(transition.action);
      }
    });

    return Array.from(validActions);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: NavigationState, context: StateContext) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState, { ...this.context });
      } catch (error) {
        console.error('Error in state machine listener:', error);
      }
    });
  }

  /**
   * Clear listeners
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get state machine diagram (for debugging)
   */
  getDiagram(): string {
    const lines: string[] = [
      'Navigation State Machine',
      '========================',
      '',
      'States: overview, category-detail, file-detail',
      '',
      'Transitions:'
    ];

    this.transitions.forEach(transition => {
      const from = Array.isArray(transition.from)
        ? `[${transition.from.join(', ')}]`
        : transition.from;

      const guard = transition.guard ? ' (guarded)' : '';
      lines.push(`  ${from} --[${transition.action}]${guard}--> ${transition.to}`);
    });

    lines.push('');
    lines.push(`Current State: ${this.currentState}`);
    lines.push(`Valid Actions: ${this.getValidActions().join(', ')}`);

    return lines.join('\n');
  }

  /**
   * Serialize state (for persistence)
   */
  serialize(): string {
    return JSON.stringify({
      state: this.currentState,
      context: this.context
    });
  }

  /**
   * Deserialize state (restore from persistence)
   */
  static deserialize(serialized: string): NavigationStateMachine {
    const data = JSON.parse(serialized);
    const machine = new NavigationStateMachine(data.state);
    machine.context = data.context;
    return machine;
  }

  /**
   * Clone state machine
   */
  clone(): NavigationStateMachine {
    const cloned = new NavigationStateMachine(this.currentState);
    cloned.context = { ...this.context, history: [...this.context.history] };
    return cloned;
  }
}

/**
 * Create a navigation state machine
 */
export function createNavigationStateMachine(
  initialState: NavigationState = 'overview'
): NavigationStateMachine {
  return new NavigationStateMachine(initialState);
}
