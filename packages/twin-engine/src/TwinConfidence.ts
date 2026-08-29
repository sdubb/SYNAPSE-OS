/**
 * @file TwinConfidence.ts
 * @description Computes multi-dimensional confidence, telemetry freshness, schema coverage, and assumption tracking for Digital Twins.
 */

export interface ModelAssumption {
  readonly id: string;
  readonly description: string;
  readonly category: 'schema_inference' | 'relationship_heuristic' | 'telemetry_imputation' | 'default_fallback';
  readonly affectedEntityIds: readonly string[];
  readonly penaltyWeight: number; // 0.0 to 1.0
  readonly recordedAt: number;
}

export interface ConfidenceScoreBreakdown {
  readonly freshnessScore: number;       // 0.0 to 1.0 (decay based on time elapsed since last telemetry update)
  readonly coverageScore: number;        // 0.0 to 1.0 (proportion of required properties and relations populated)
  readonly sourceReliabilityScore: number; // 0.0 to 1.0 (reliability of data sources: live telemetry > DB sync > inferred)
  readonly overallConfidence: number;    // Composite score
  readonly staleDurationMs: number;
  readonly assumptions: readonly ModelAssumption[];
  readonly isGroundTruth: boolean;
}

export interface ConfidenceEvaluationOptions {
  readonly maxStalenessMs?: number; // Time after which freshness drops to 0 (default 1 hour)
  readonly halfLifeMs?: number;     // Half-life for freshness decay (default 10 mins)
  readonly sourceReliabilityMap?: Record<string, number>;
}

export class TwinConfidence {
  private static readonly DEFAULT_MAX_STALENESS = 3600 * 1000; // 1 hr
  private static readonly DEFAULT_HALF_LIFE = 600 * 1000;      // 10 mins

  private static readonly DEFAULT_SOURCE_RELIABILITY: Record<string, number> = {
    'direct_telemetry': 1.0,
    'database_replication': 0.95,
    'api_polling': 0.9,
    'log_parsed': 0.85,
    'heuristic_inference': 0.65,
    'static_default': 0.5,
  };

  /**
   * Computes comprehensive confidence breakdown for a Digital Twin.
   */
  public static evaluate(
    params: {
      lastTelemetryTimestamp: number;
      primarySourceSystem: string;
      expectedPropertyCount: number;
      observedPropertyCount: number;
      assumptions: readonly ModelAssumption[];
      now?: number;
    },
    options: ConfidenceEvaluationOptions = {}
  ): ConfidenceScoreBreakdown {
    const now = params.now ?? Date.now();
    const staleDurationMs = Math.max(0, now - params.lastTelemetryTimestamp);
    const maxStaleness = options.maxStalenessMs ?? this.DEFAULT_MAX_STALENESS;
    const halfLife = options.halfLifeMs ?? this.DEFAULT_HALF_LIFE;

    // 1. Freshness score with exponential half-life decay
    let freshnessScore = Number(Math.exp((-staleDurationMs * Math.LN2) / halfLife).toFixed(4));
    if (staleDurationMs >= maxStaleness) {
      freshnessScore = 0;
    }

    // 2. Coverage score
    let coverageScore = 1.0;
    if (params.expectedPropertyCount > 0) {
      coverageScore = Math.min(1.0, Math.max(0, params.observedPropertyCount / params.expectedPropertyCount));
    }
    coverageScore = Number(coverageScore.toFixed(4));

    // 3. Source reliability score
    const sourceMap = { ...this.DEFAULT_SOURCE_RELIABILITY, ...options.sourceReliabilityMap };
    const sourceReliabilityScore = sourceMap[params.primarySourceSystem] ?? 0.7;

    // 4. Penalty from unverified assumptions
    let totalAssumptionPenalty = 0;
    for (const assumption of params.assumptions) {
      totalAssumptionPenalty += assumption.penaltyWeight;
    }
    const assumptionPenaltyFactor = Math.max(0.2, 1.0 - totalAssumptionPenalty);

    // 5. Composite overall confidence score
    // Weighted combination: 35% freshness, 35% source reliability, 30% coverage, scaled by assumption factor
    const rawOverall = (freshnessScore * 0.35 + sourceReliabilityScore * 0.35 + coverageScore * 0.30) * assumptionPenaltyFactor;
    const overallConfidence = Number(Math.min(1.0, Math.max(0, rawOverall)).toFixed(4));

    const isGroundTruth = primaryIsGroundTruth(params.primarySourceSystem, freshnessScore, params.assumptions.length);

    return {
      freshnessScore,
      coverageScore,
      sourceReliabilityScore,
      overallConfidence,
      staleDurationMs,
      assumptions: Object.freeze([...params.assumptions]),
      isGroundTruth,
    };
  }
}

function primaryIsGroundTruth(source: string, freshness: number, assumptionCount: number): boolean {
  return (
    (source === 'direct_telemetry' || source === 'database_replication') &&
    freshness > 0.8 &&
    assumptionCount === 0
  );
}
