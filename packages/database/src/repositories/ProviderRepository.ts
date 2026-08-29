import { eq, and, desc } from "drizzle-orm";
import type { SynapseDatabase } from "../client.js";
import {
  providerKeys,
  llmModels,
  type ProviderKeyRecord,
  type NewProviderKeyRecord,
  type LLMModelRecord,
  type NewLLMModelRecord,
} from "../schemas/providers.js";
import { TenantContext, TenantIsolation } from "@synapse/tenancy";

export class ProviderRepository {
  constructor(private readonly db: SynapseDatabase) {}

  private resolveTenantId(explicitTenantId?: string): string {
    const tenantId = explicitTenantId || TenantContext.requireTenantId();
    if (explicitTenantId) {
      TenantIsolation.assertTenantMatch(explicitTenantId, "ProviderRepository");
    }
    return tenantId;
  }

  // ─── Provider Keys ───

  async listKeys(options?: { tenantId?: string; provider?: string; limit?: number }): Promise<ProviderKeyRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const conditions = [eq(providerKeys.tenantId, tid), eq(providerKeys.isActive, true)];
    if (options?.provider) {
      conditions.push(eq(providerKeys.provider, options.provider));
    }
    return await this.db
      .select()
      .from(providerKeys)
      .where(and(...conditions))
      .orderBy(desc(providerKeys.createdAt))
      .limit(options?.limit ?? 50);
  }

  async findKeyById(id: string, tenantId?: string): Promise<ProviderKeyRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(providerKeys)
      .where(and(eq(providerKeys.id, id), eq(providerKeys.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async createKey(data: Omit<NewProviderKeyRecord, "tenantId"> & { tenantId?: string }): Promise<ProviderKeyRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(providerKeys)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create provider key");
    return created;
  }

  async updateKey(id: string, data: Partial<NewProviderKeyRecord>, tenantId?: string): Promise<ProviderKeyRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(providerKeys)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(providerKeys.id, id), eq(providerKeys.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async deleteKey(id: string, tenantId?: string): Promise<boolean> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(providerKeys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(providerKeys.id, id), eq(providerKeys.tenantId, tid)))
      .returning({ id: providerKeys.id });
    return results.length > 0;
  }

  /**
   * Simulate key validation (in production, this would call the provider's API).
   * Updates the status and lastValidatedAt timestamp.
   */
  async validateKey(id: string, tenantId?: string): Promise<ProviderKeyRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    // In production: decrypt key, call provider health endpoint
    const results = await this.db
      .update(providerKeys)
      .set({
        status: "ACTIVE",
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(providerKeys.id, id), eq(providerKeys.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  /**
   * Rotate a provider key (replace encrypted key and revalidate).
   */
  async rotateKey(id: string, newEncryptedApiKey: string, tenantId?: string): Promise<ProviderKeyRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(providerKeys)
      .set({
        encryptedApiKey: newEncryptedApiKey,
        status: "ACTIVE",
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(providerKeys.id, id), eq(providerKeys.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  // ─── LLM Models ───

  async listModels(options?: { tenantId?: string; provider?: string; enabledOnly?: boolean; limit?: number }): Promise<LLMModelRecord[]> {
    const tid = this.resolveTenantId(options?.tenantId);
    const conditions = [eq(llmModels.tenantId, tid)];
    if (options?.provider) {
      conditions.push(eq(llmModels.provider, options.provider));
    }
    if (options?.enabledOnly) {
      conditions.push(eq(llmModels.enabled, true));
    }
    return await this.db
      .select()
      .from(llmModels)
      .where(and(...conditions))
      .orderBy(desc(llmModels.createdAt))
      .limit(options?.limit ?? 100);
  }

  async findModelById(id: string, tenantId?: string): Promise<LLMModelRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .select()
      .from(llmModels)
      .where(and(eq(llmModels.id, id), eq(llmModels.tenantId, tid)))
      .limit(1);
    return results[0] ?? null;
  }

  async createModel(data: Omit<NewLLMModelRecord, "tenantId"> & { tenantId?: string }): Promise<LLMModelRecord> {
    const tid = this.resolveTenantId(data.tenantId);
    const results = await this.db
      .insert(llmModels)
      .values({ ...data, tenantId: tid })
      .returning();
    const created = results[0];
    if (!created) throw new Error("Failed to create LLM model");
    return created;
  }

  async updateModel(id: string, data: Partial<NewLLMModelRecord>, tenantId?: string): Promise<LLMModelRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .update(llmModels)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(llmModels.id, id), eq(llmModels.tenantId, tid)))
      .returning();
    return results[0] ?? null;
  }

  async deleteModel(id: string, tenantId?: string): Promise<boolean> {
    const tid = this.resolveTenantId(tenantId);
    const results = await this.db
      .delete(llmModels)
      .where(and(eq(llmModels.id, id), eq(llmModels.tenantId, tid)))
      .returning({ id: llmModels.id });
    return results.length > 0;
  }

  /**
   * Seed default models for a tenant if none exist.
   */
  async seedDefaults(tenantId: string): Promise<void> {
    const existing = await this.listModels({ tenantId, limit: 1 });
    if (existing.length > 0) return;

    const defaults: Omit<NewLLMModelRecord, "tenantId">[] = [
      {
        modelId: "claude-3-7-sonnet",
        provider: "anthropic",
        displayName: "Claude 3.7 Sonnet (Hybrid Thinking)",
        contextWindow: "200000",
        inputPricingPer1M: "3.00",
        outputPricingPer1M: "15.00",
        rateLimitRpm: "4000",
        rateLimitTpm: "400000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["vision", "function_calling", "reasoning", "extended_thinking"],
      },
      {
        modelId: "claude-3-5-sonnet",
        provider: "anthropic",
        displayName: "Claude 3.5 Sonnet",
        contextWindow: "200000",
        inputPricingPer1M: "3.00",
        outputPricingPer1M: "15.00",
        rateLimitRpm: "8000",
        rateLimitTpm: "800000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["vision", "function_calling"],
      },
      {
        modelId: "gpt-4o",
        provider: "openai",
        displayName: "GPT-4o Omnimodal",
        contextWindow: "128000",
        inputPricingPer1M: "2.50",
        outputPricingPer1M: "10.00",
        rateLimitRpm: "5000",
        rateLimitTpm: "500000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["vision", "function_calling", "audio"],
      },
      {
        modelId: "gpt-4o-mini",
        provider: "openai",
        displayName: "GPT-4o Mini",
        contextWindow: "128000",
        inputPricingPer1M: "0.15",
        outputPricingPer1M: "0.60",
        rateLimitRpm: "10000",
        rateLimitTpm: "1000000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["vision", "function_calling"],
      },
      {
        modelId: "gemini-1-5-pro",
        provider: "google",
        displayName: "Gemini 1.5 Pro (2M Context)",
        contextWindow: "2000000",
        inputPricingPer1M: "1.25",
        outputPricingPer1M: "5.00",
        rateLimitRpm: "2000",
        rateLimitTpm: "1000000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["vision", "function_calling", "code_execution"],
      },
      {
        modelId: "gemini-2-0-flash",
        provider: "google",
        displayName: "Gemini 2.0 Flash",
        contextWindow: "1000000",
        inputPricingPer1M: "0.10",
        outputPricingPer1M: "0.40",
        rateLimitRpm: "15000",
        rateLimitTpm: "1000000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["vision", "function_calling"],
      },
      {
        modelId: "deepseek-r1",
        provider: "deepseek",
        displayName: "DeepSeek R1 Reasoning",
        contextWindow: "64000",
        inputPricingPer1M: "0.55",
        outputPricingPer1M: "2.19",
        rateLimitRpm: "3000",
        rateLimitTpm: "300000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["reasoning", "function_calling"],
      },
      {
        modelId: "deepseek-v3",
        provider: "deepseek",
        displayName: "DeepSeek V3",
        contextWindow: "64000",
        inputPricingPer1M: "0.27",
        outputPricingPer1M: "1.10",
        rateLimitRpm: "3000",
        rateLimitTpm: "300000",
        availability: "AVAILABLE",
        enabled: true,
        capabilities: ["function_calling"],
      },
    ];

    for (const model of defaults) {
      await this.createModel({ ...model, tenantId });
    }
  }
}
