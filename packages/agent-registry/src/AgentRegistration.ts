/**
 * @file AgentRegistration.ts
 * @description Agent definition registration, model configuration, system prompt templating, and validation for Synapse OS.
 */

import { AgentCapabilities, AgentCapabilitiesConfig } from './AgentCapabilities.js';
import { AgentOwnership, AgentOwnershipConfig } from './AgentOwnership.js';
import { AgentHealthTracker } from './AgentHealth.js';

export type ModelProvider =
  | 'anthropic'
  | 'openai'
  | 'bedrock'
  | 'vertex'
  | 'ollama'
  | 'openrouter'
  | 'deepseek';

export interface ModelConfiguration {
  readonly provider: ModelProvider;
  readonly modelId: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly topP?: number;
  readonly contextWindowTokens: number;
  readonly reasoningEffort?: 'low' | 'medium' | 'high';
  readonly customHeaders?: Record<string, string>;
  readonly stream: boolean;
}

export interface AgentDefinitionInput {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly systemPrompt: string;
  readonly modelConfig: ModelConfiguration;
  readonly capabilities: AgentCapabilitiesConfig | AgentCapabilities;
  readonly ownership: AgentOwnershipConfig | AgentOwnership;
  readonly tags?: readonly string[];
  readonly labels?: Record<string, string>;
  readonly isDeprecated?: boolean;
  readonly deprecationReason?: string;
}

export class AgentRegistration {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly version: string;
  public readonly author: string;
  public readonly systemPrompt: string;
  public readonly modelConfig: ModelConfiguration;
  public readonly capabilities: AgentCapabilities;
  public readonly ownership: AgentOwnership;
  public readonly tags: readonly string[];
  public readonly labels: Readonly<Record<string, string>>;
  public readonly healthTracker: AgentHealthTracker;
  public readonly isDeprecated: boolean;
  public readonly deprecationReason?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(input: AgentDefinitionInput) {
    AgentRegistration.validate(input);

    this.id = input.id;
    this.name = input.name;
    this.description = input.description;
    this.version = input.version;
    this.author = input.author;
    this.systemPrompt = input.systemPrompt;
    this.modelConfig = Object.freeze({ ...input.modelConfig });

    this.capabilities = input.capabilities instanceof AgentCapabilities
      ? input.capabilities
      : new AgentCapabilities(input.capabilities);

    this.ownership = input.ownership instanceof AgentOwnership
      ? input.ownership
      : new AgentOwnership(input.ownership);

    this.tags = Object.freeze(input.tags ? [...input.tags] : []);
    this.labels = Object.freeze(input.labels ? { ...input.labels } : {});
    this.isDeprecated = !!input.isDeprecated;
    this.deprecationReason = input.deprecationReason;
    this.healthTracker = new AgentHealthTracker(this.id);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public renderSystemPrompt(variables: Record<string, string>): string {
    let rendered = this.systemPrompt;
    for (const [key, val] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(placeholder, val);
    }
    return rendered;
  }

  public static validate(input: AgentDefinitionInput): void {
    if (!input.id || typeof input.id !== 'string' || input.id.trim().length === 0) {
      throw new Error('Agent registration error: id is required');
    }

    if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
      throw new Error('Agent registration error: name is required');
    }

    if (!input.version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(input.version)) {
      throw new Error(`Agent registration error: invalid semver version '${input.version}'`);
    }

    if (!input.systemPrompt || typeof input.systemPrompt !== 'string' || input.systemPrompt.trim().length === 0) {
      throw new Error('Agent registration error: systemPrompt must not be empty');
    }

    const { modelConfig } = input;
    if (!modelConfig) {
      throw new Error('Agent registration error: modelConfig is required');
    }

    if (modelConfig.temperature < 0 || modelConfig.temperature > 2) {
      throw new Error(`Agent registration error: temperature (${modelConfig.temperature}) must be between 0.0 and 2.0`);
    }

    if (modelConfig.maxTokens <= 0 || !Number.isInteger(modelConfig.maxTokens)) {
      throw new Error(`Agent registration error: maxTokens (${modelConfig.maxTokens}) must be a positive integer`);
    }

    if (modelConfig.contextWindowTokens <= 0 || !Number.isInteger(modelConfig.contextWindowTokens)) {
      throw new Error(`Agent registration error: contextWindowTokens (${modelConfig.contextWindowTokens}) must be a positive integer`);
    }
  }

  public cloneWithOverrides(overrides: Partial<AgentDefinitionInput>): AgentRegistration {
    return new AgentRegistration({
      id: overrides.id ?? `${this.id}-copy`,
      name: overrides.name ?? this.name,
      description: overrides.description ?? this.description,
      version: overrides.version ?? this.version,
      author: overrides.author ?? this.author,
      systemPrompt: overrides.systemPrompt ?? this.systemPrompt,
      modelConfig: overrides.modelConfig ?? this.modelConfig,
      capabilities: overrides.capabilities ?? this.capabilities,
      ownership: overrides.ownership ?? this.ownership,
      tags: overrides.tags ?? this.tags,
      labels: overrides.labels ?? this.labels,
      isDeprecated: overrides.isDeprecated ?? this.isDeprecated,
      deprecationReason: overrides.deprecationReason ?? this.deprecationReason,
    });
  }
}
