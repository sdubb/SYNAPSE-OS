export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricValue {
  labels: MetricLabels;
  value: number;
  timestamp?: number;
}

export interface HistogramBucket {
  le: number;
  count: number;
}

export interface HistogramValue {
  labels: MetricLabels;
  sum: number;
  count: number;
  buckets: HistogramBucket[];
}

export class Counter {
  public readonly name: string;
  public readonly help: string;
  private values = new Map<string, MetricValue>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  private getLabelKey(labels: MetricLabels): string {
    const keys = Object.keys(labels).sort();
    return keys.map((k) => `${k}="${labels[k]}"`).join(',');
  }

  public inc(labels: MetricLabels = {}, amount = 1): void {
    if (amount < 0) throw new Error('Counter increment must be non-negative.');
    const key = this.getLabelKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      this.values.set(key, { labels, value: amount });
    }
  }

  public getValues(): MetricValue[] {
    return Array.from(this.values.values());
  }

  public reset(): void {
    this.values.clear();
  }
}

export class Gauge {
  public readonly name: string;
  public readonly help: string;
  private values = new Map<string, MetricValue>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  private getLabelKey(labels: MetricLabels): string {
    const keys = Object.keys(labels).sort();
    return keys.map((k) => `${k}="${labels[k]}"`).join(',');
  }

  public set(labels: MetricLabels = {}, value: number): void {
    const key = this.getLabelKey(labels);
    this.values.set(key, { labels, value });
  }

  public inc(labels: MetricLabels = {}, amount = 1): void {
    const key = this.getLabelKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      this.values.set(key, { labels, value: amount });
    }
  }

  public dec(labels: MetricLabels = {}, amount = 1): void {
    this.inc(labels, -amount);
  }

  public getValues(): MetricValue[] {
    return Array.from(this.values.values());
  }

  public reset(): void {
    this.values.clear();
  }
}

export class Histogram {
  public readonly name: string;
  public readonly help: string;
  private readonly defaultBuckets: number[];
  private values = new Map<string, HistogramValue>();

  constructor(
    name: string,
    help: string,
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60]
  ) {
    this.name = name;
    this.help = help;
    this.defaultBuckets = [...buckets].sort((a, b) => a - b);
  }

  private getLabelKey(labels: MetricLabels): string {
    const keys = Object.keys(labels).sort();
    return keys.map((k) => `${k}="${labels[k]}"`).join(',');
  }

  public observe(labels: MetricLabels = {}, value: number): void {
    const key = this.getLabelKey(labels);
    let hist = this.values.get(key);
    if (!hist) {
      hist = {
        labels,
        sum: 0,
        count: 0,
        buckets: this.defaultBuckets.map((le) => ({ le, count: 0 })),
      };
      this.values.set(key, hist);
    }

    hist.sum += value;
    hist.count += 1;

    for (const b of hist.buckets) {
      if (value <= b.le) {
        b.count += 1;
      }
    }
  }

  public getValues(): HistogramValue[] {
    return Array.from(this.values.values());
  }

  public reset(): void {
    this.values.clear();
  }
}

export class MetricsRegistry {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();

  // Pre-instantiated standard Synapse metrics
  public readonly activeAgents: Gauge;
  public readonly activeSessions: Gauge;
  public readonly activeTasks: Gauge;
  public readonly tokenUsageTotal: Counter;
  public readonly toolCallsTotal: Counter;
  public readonly toolErrorTotal: Counter;
  public readonly httpRequestsTotal: Counter;
  public readonly httpDurationSeconds: Histogram;
  public readonly llmLatencySeconds: Histogram;
  public readonly approvalDurationSeconds: Histogram;

  constructor() {
    this.activeAgents = this.createGauge('synapse_active_agents', 'Current number of active running agents');
    this.activeSessions = this.createGauge('synapse_active_sessions', 'Current number of active Cline sessions');
    this.activeTasks = this.createGauge('synapse_active_tasks', 'Current number of active running tasks');
    this.tokenUsageTotal = this.createCounter('synapse_token_count_total', 'Total token usage across models and tenants');
    this.toolCallsTotal = this.createCounter('synapse_tool_calls_total', 'Total number of tool calls requested');
    this.toolErrorTotal = this.createCounter('synapse_tool_errors_total', 'Total number of tool execution failures');
    this.httpRequestsTotal = this.createCounter('synapse_http_requests_total', 'Total number of HTTP API requests');
    this.httpDurationSeconds = this.createHistogram('synapse_http_duration_seconds', 'HTTP request duration in seconds');
    this.llmLatencySeconds = this.createHistogram('synapse_llm_latency_seconds', 'LLM request duration in seconds');
    this.approvalDurationSeconds = this.createHistogram('synapse_approval_duration_seconds', 'Approval duration until human resolution');
  }

  public createCounter(name: string, help: string): Counter {
    const counter = new Counter(name, help);
    this.counters.set(name, counter);
    return counter;
  }

  public createGauge(name: string, help: string): Gauge {
    const gauge = new Gauge(name, help);
    this.gauges.set(name, gauge);
    return gauge;
  }

  public createHistogram(name: string, help: string, buckets?: number[]): Histogram {
    const histogram = new Histogram(name, help, buckets);
    this.histograms.set(name, histogram);
    return histogram;
  }

  /**
   * Formats all registered metrics in Prometheus / OpenMetrics text format.
   */
  public toPrometheusFormat(): string {
    const lines: string[] = [];

    // Format Counters
    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const val of counter.getValues()) {
        const labelsStr = this.formatLabels(val.labels);
        lines.push(`${counter.name}${labelsStr} ${val.value}`);
      }
    }

    // Format Gauges
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      for (const val of gauge.getValues()) {
        const labelsStr = this.formatLabels(val.labels);
        lines.push(`${gauge.name}${labelsStr} ${val.value}`);
      }
    }

    // Format Histograms
    for (const hist of this.histograms.values()) {
      lines.push(`# HELP ${hist.name} ${hist.help}`);
      lines.push(`# TYPE ${hist.name} histogram`);
      for (const val of hist.getValues()) {
        const baseLabels = val.labels;
        for (const bucket of val.buckets) {
          const bucketLabels = { ...baseLabels, le: bucket.le };
          lines.push(`${hist.name}_bucket${this.formatLabels(bucketLabels)} ${bucket.count}`);
        }
        const infLabels = { ...baseLabels, le: '+Inf' };
        lines.push(`${hist.name}_bucket${this.formatLabels(infLabels)} ${val.count}`);
        lines.push(`${hist.name}_sum${this.formatLabels(baseLabels)} ${val.sum}`);
        lines.push(`${hist.name}_count${this.formatLabels(baseLabels)} ${val.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private formatLabels(labels: MetricLabels): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    const formatted = entries
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
      .join(',');
    return `{${formatted}}`;
  }
}

export const metrics = new MetricsRegistry();
