import { fetchClineRecommendedModels, Llms } from '@cline/core';
import { logger } from '@synapse/observability';

export interface CatalogProvider {
  id: string;
  name: string;
  models: CatalogModel[];
}

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  capabilities: string[];
  tier: 'recommended' | 'free' | 'subscribed' | 'available';
}

export class CatalogController {
  private static instance: CatalogController | null = null;
  private cachedProviders: CatalogProvider[] | null = null;
  private cachedModels: CatalogModel[] | null = null;
  private lastFetch = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): CatalogController {
    if (!CatalogController.instance) {
      CatalogController.instance = new CatalogController();
    }
    return CatalogController.instance;
  }

  /**
   * Get all Cline built-in providers with their display names.
   */
  getProviders(): string[] {
    return [...Llms.BUILT_IN_PROVIDER_IDS];
  }

  /**
   * Fetch the full model catalog from Cline's recommended models endpoint.
   * This gives us the real models that Cline supports, not made-up ones.
   */
  async getCatalog(): Promise<{ providers: CatalogProvider[]; models: CatalogModel[] }> {
    const now = Date.now();
    if (this.cachedProviders && this.cachedModels && now - this.lastFetch < this.CACHE_TTL) {
      return { providers: this.cachedProviders, models: this.cachedModels };
    }

    try {
      const data = await fetchClineRecommendedModels();

      const models: CatalogModel[] = [];
      const providerMap = new Map<string, CatalogProvider>();

      const ensureProvider = (id: string): CatalogProvider => {
        if (!providerMap.has(id)) {
          providerMap.set(id, { id, name: id, models: [] });
        }
        return providerMap.get(id)!;
      };

      // Map Cline model IDs to the real provider they route through
      const ROUTE_PROVIDER_MAP: Record<string, string> = {
        'openrouter': 'openrouter',
        'anthropic': 'anthropic',
        'openai-native': 'openai',
        'openai': 'openai',
        'gemini': 'google',
        'deepseek': 'deepseek',
        'xai': 'xai',
        'groq': 'groq',
        'together': 'together',
        'mistral': 'mistral',
        'bedrock': 'aws-bedrock',
        'vertex': 'gcp-vertex',
      };

      const extractProvider = (modelId: string): string => {
        const slash = modelId.indexOf('/');
        return slash > 0 ? modelId.substring(0, slash) : 'openrouter';
      };

      const resolveRealProvider = (clineProviderId: string, modelId: string): string => {
        // If provider is already a real API provider (not "cline" or "cline-pass"), use it directly
        if (clineProviderId && clineProviderId !== 'cline' && clineProviderId !== 'cline-pass') {
          return ROUTE_PROVIDER_MAP[clineProviderId] || clineProviderId;
        }
        // For cline/cline-pass providers, extract from model ID
        return extractProvider(modelId);
      };

      const addModel = (m: Record<string, unknown>, tier: CatalogModel['tier']) => {
        const id = String(m.id || '');
        const clineProvider = String(m.provider || '');
        const providerId = resolveRealProvider(clineProvider, id);
        const provider = ensureProvider(providerId);
        const model: CatalogModel = {
          id,
          name: String(m.name || id),
          provider: providerId,
          contextWindow: Number(m.maxTokens) || 128000,
          capabilities: Array.isArray(m.capabilities) ? (m.capabilities as string[]) : [],
          tier,
        };
        provider.models.push(model);
        models.push(model);
      };

      for (const m of data.recommended) addModel(m, 'recommended');
      for (const m of data.free) addModel(m, 'free');
      // Skip clinePass models — they require a subscription the tenant may not have
      // for (const m of data.clinePass) addModel(m, 'subscribed');

      this.cachedProviders = [...providerMap.values()];
      this.cachedModels = models;
      this.lastFetch = now;

      logger.info(`[CatalogController] Loaded ${models.length} models from ${this.cachedProviders.length} providers`);
      return { providers: this.cachedProviders, models: this.cachedModels };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`[CatalogController] Failed to fetch Cline recommended models: ${message}`);

      // Return empty if fetch fails — the frontend has fallback defaults
      return { providers: [], models: [] };
    }
  }
}
