export interface ModelPricing {
  modelId: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  cacheReadCostPerMillion?: number;
  cacheWriteCostPerMillion?: number;
}

export interface TokenUsageRecord {
  tenantId: string;
  projectId?: string;
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  timestamp: string;
}

export interface CostSummary {
  tenantId: string;
  totalCostUSD: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cacheTokens: number;
  usageCount: number;
  byModel: Record<string, { tokens: number; costUSD: number }>;
}

export class CostTelemetry {
  private readonly pricingTable = new Map<string, ModelPricing>();
  private readonly usageRecords: TokenUsageRecord[] = [];

  constructor() {
    this.registerDefaultPricing();
  }

  private registerDefaultPricing(): void {
    const defaults: ModelPricing[] = [
      {
        modelId: 'claude-3-5-sonnet-20241022',
        inputCostPerMillion: 3.0,
        outputCostPerMillion: 15.0,
        cacheReadCostPerMillion: 0.3,
        cacheWriteCostPerMillion: 3.75,
      },
      {
        modelId: 'claude-3-opus-20240229',
        inputCostPerMillion: 15.0,
        outputCostPerMillion: 75.0,
        cacheReadCostPerMillion: 1.5,
        cacheWriteCostPerMillion: 18.75,
      },
      {
        modelId: 'claude-3-5-haiku-20241022',
        inputCostPerMillion: 0.8,
        outputCostPerMillion: 4.0,
        cacheReadCostPerMillion: 0.08,
        cacheWriteCostPerMillion: 1.0,
      },
      {
        modelId: 'gpt-4o',
        inputCostPerMillion: 2.5,
        outputCostPerMillion: 10.0,
        cacheReadCostPerMillion: 1.25,
      },
      {
        modelId: 'gpt-4o-mini',
        inputCostPerMillion: 0.15,
        outputCostPerMillion: 0.6,
        cacheReadCostPerMillion: 0.075,
      },
      {
        modelId: 'deepseek-coder',
        inputCostPerMillion: 0.14,
        outputCostPerMillion: 0.28,
      },
    ];

    for (const p of defaults) {
      this.pricingTable.set(p.modelId, p);
    }
  }

  public registerPricing(pricing: ModelPricing): void {
    this.pricingTable.set(pricing.modelId, pricing);
  }

  public calculateCost(
    modelId: string,
    promptTokens: number,
    completionTokens: number,
    cacheReadTokens = 0,
    cacheWriteTokens = 0
  ): number {
    const pricing = this.pricingTable.get(modelId) ?? {
      modelId,
      inputCostPerMillion: 3.0,
      outputCostPerMillion: 15.0,
    };

    const inputCost = (promptTokens / 1_000_000) * pricing.inputCostPerMillion;
    const outputCost = (completionTokens / 1_000_000) * pricing.outputCostPerMillion;
    const cacheReadCost = ((cacheReadTokens || 0) / 1_000_000) * (pricing.cacheReadCostPerMillion ?? 0);
    const cacheWriteCost = ((cacheWriteTokens || 0) / 1_000_000) * (pricing.cacheWriteCostPerMillion ?? 0);

    return parseFloat((inputCost + outputCost + cacheReadCost + cacheWriteCost).toFixed(6));
  }

  public recordUsage(record: TokenUsageRecord): number {
    this.usageRecords.push(record);
    return this.calculateCost(
      record.modelId,
      record.promptTokens,
      record.completionTokens,
      record.cacheReadTokens,
      record.cacheWriteTokens
    );
  }

  public getSummaryForTenant(
    tenantId: string,
    sinceTimestamp?: string
  ): CostSummary {
    const since = sinceTimestamp ? new Date(sinceTimestamp).getTime() : 0;
    const records = this.usageRecords.filter(
      (r) => r.tenantId === tenantId && new Date(r.timestamp).getTime() >= since
    );

    let totalCostUSD = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let cacheTokens = 0;
    const byModel: Record<string, { tokens: number; costUSD: number }> = {};

    for (const r of records) {
      const cost = this.calculateCost(
        r.modelId,
        r.promptTokens,
        r.completionTokens,
        r.cacheReadTokens,
        r.cacheWriteTokens
      );
      const tokens = r.promptTokens + r.completionTokens + (r.cacheReadTokens ?? 0) + (r.cacheWriteTokens ?? 0);

      totalCostUSD += cost;
      promptTokens += r.promptTokens;
      completionTokens += r.completionTokens;
      cacheTokens += (r.cacheReadTokens ?? 0) + (r.cacheWriteTokens ?? 0);

      if (!byModel[r.modelId]) {
        byModel[r.modelId] = { tokens: 0, costUSD: 0 };
      }
      byModel[r.modelId].tokens += tokens;
      byModel[r.modelId].costUSD = parseFloat((byModel[r.modelId].costUSD + cost).toFixed(6));
    }

    return {
      tenantId,
      totalCostUSD: parseFloat(totalCostUSD.toFixed(6)),
      totalTokens: promptTokens + completionTokens + cacheTokens,
      promptTokens,
      completionTokens,
      cacheTokens,
      usageCount: records.length,
      byModel,
    };
  }
}

export const costTelemetry = new CostTelemetry();
