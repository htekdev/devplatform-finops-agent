/**
 * State Manager
 * Provides typed access and validation for FinOpsState
 */

import type { FinOpsState } from '../types/state';
import { createEmptyState } from '../types/state';
import { getLogger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

export class StateManager {
  private state: FinOpsState;
  private readonly logger = getLogger();

  constructor(initialState?: Partial<FinOpsState>) {
    this.state = {
      ...createEmptyState([], []),
      ...initialState,
    };
  }

  /**
   * Get the entire state (read-only)
   */
  getState(): Readonly<FinOpsState> {
    return { ...this.state };
  }

  /**
   * Get a snapshot of the state for debugging
   */
  getSnapshot(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Update state (validates structure)
   */
  updateState(updates: Partial<FinOpsState>): void {
    this.state = {
      ...this.state,
      ...updates,
    };
    this.validateState();
  }

  /**
   * Get GitHub data for an organization
   */
  getGitHubData(org: string) {
    return this.state.githubData[org];
  }

  /**
   * Get Azure DevOps data for an organization
   */
  getAzdoData(org: string) {
    return this.state.azureDevOpsData[org];
  }

  /**
   * Get calculated costs
   */
  getCosts() {
    return this.state.costs;
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    return this.state.recommendations;
  }

  /**
   * Validate state structure
   */
  private validateState(): void {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('State must be an object');
    }

    if (typeof this.state.githubData !== 'object') {
      throw new Error('State.githubData must be an object');
    }

    if (typeof this.state.azureDevOpsData !== 'object') {
      throw new Error('State.azureDevOpsData must be an object');
    }
  }

  /**
   * Save state to file
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(this.state, null, 2), 'utf-8');
      this.logger.info(`State saved to ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save state to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load state from file
   */
  static loadFromFile(filePath: string): StateManager {
    const logger = getLogger();
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const loadedState = JSON.parse(content) as FinOpsState;
      logger.info(`State loaded from ${filePath}`);
      return new StateManager(loadedState);
    } catch (error) {
      logger.error(`Failed to load state from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Reset state to empty
   */
  reset(): void {
    this.state = createEmptyState([], []);
    this.logger.debug('State reset to empty');
  }
}

/**
 * Create a new state manager
 */
export function createStateManager(initialState?: Partial<FinOpsState>): StateManager {
  return new StateManager(initialState);
}
