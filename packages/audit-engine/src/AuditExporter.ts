import { AuditRecord } from './AuditWriter.js';
import { AuditHasher } from './AuditHasher.js';

export type ExportFormat = 'JSON' | 'JSONL' | 'CSV' | 'CEF' | 'SYSLOG';

export interface AuditExportOptions {
  format: ExportFormat;
  includeVerificationHeader?: boolean;
  hostname?: string;
  appName?: string;
}

export class AuditExporter {
  /**
   * Exports an array of audit records into the designated format.
   */
  public static export(records: AuditRecord[], options: AuditExportOptions): string {
    switch (options.format) {
      case 'JSON':
        return this.toJSON(records, options.includeVerificationHeader ?? true);
      case 'JSONL':
        return this.toJSONL(records);
      case 'CSV':
        return this.toCSV(records);
      case 'CEF':
        return this.toCEF(records);
      case 'SYSLOG':
        return this.toSyslog(records, options.hostname ?? 'synapse-node-01', options.appName ?? 'synapse-audit');
      default:
        throw new Error(`Unsupported export format: ${String(options.format)}`);
    }
  }

  public static toJSON(records: AuditRecord[], includeHeader = true): string {
    const merkleData = AuditHasher.buildMerkleTree(records.map((r) => r.hash));
    const payload = {
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      merkleRoot: merkleData.root,
      records,
    };
    return includeHeader
      ? JSON.stringify(payload, null, 2)
      : JSON.stringify(records, null, 2);
  }

  public static toJSONL(records: AuditRecord[]): string {
    return records.map((r) => JSON.stringify(r)).join('\n');
  }

  public static toCSV(records: AuditRecord[]): string {
    const headers = [
      'id',
      'sequence',
      'prevHash',
      'hash',
      'category',
      'eventType',
      'severity',
      'tenantId',
      'actorType',
      'actorId',
      'agentId',
      'taskId',
      'sessionId',
      'correlationId',
      'timestamp',
      'details',
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [headers.join(',')];

    for (const r of records) {
      const p = r.payload;
      const row = [
        escapeCsv(r.id),
        escapeCsv(r.sequence),
        escapeCsv(r.prevHash),
        escapeCsv(r.hash),
        escapeCsv(p.category),
        escapeCsv(p.eventType),
        escapeCsv(p.severity),
        escapeCsv(p.tenantId),
        escapeCsv(p.actor?.type),
        escapeCsv(p.actor?.id),
        escapeCsv(p.agentId),
        escapeCsv(p.taskId),
        escapeCsv(p.sessionId),
        escapeCsv(p.correlationId),
        escapeCsv(p.timestamp || r.createdAt),
        escapeCsv(p.details),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Common Event Format (CEF) standard for SIEM integration (e.g. ArcSight, Splunk).
   * Format: CEF:Version|Device Vendor|Device Product|Device Version|Device Event Class ID|Name|Severity|[Extension]
   */
  public static toCEF(records: AuditRecord[]): string {
    const severityMap: Record<string, number> = {
      INFO: 1,
      WARNING: 4,
      ERROR: 7,
      CRITICAL: 10,
    };

    return records
      .map((r) => {
        const p = r.payload;
        const cefSeverity = severityMap[p.severity] ?? 1;
        const name = p.eventType.replace(/\|/g, '\\|');
        const extensions: string[] = [
          `tenantId=${this.escapeCefExtension(p.tenantId)}`,
          `act=${this.escapeCefExtension(p.actor.id)}`,
          `cat=${this.escapeCefExtension(p.category)}`,
          `seq=${r.sequence}`,
          `hash=${r.hash}`,
        ];

        if (p.actor.ipAddress) extensions.push(`src=${p.actor.ipAddress}`);
        if (p.agentId) extensions.push(`agentId=${p.agentId}`);
        if (p.taskId) extensions.push(`taskId=${p.taskId}`);
        if (p.sessionId) extensions.push(`sessionId=${p.sessionId}`);
        if (p.correlationId) extensions.push(`cs1=${p.correlationId} cs1Label=CorrelationId`);

        const detailsStr = JSON.stringify(p.details).replace(/=/g, '\\=');
        extensions.push(`msg=${this.escapeCefExtension(detailsStr)}`);

        return `CEF:0|SynapseOS|SynapseAudit|1.0.0|${p.eventType}|${name}|${cefSeverity}|${extensions.join(' ')}`;
      })
      .join('\n');
  }

  /**
   * Syslog RFC 5424 structured logging format.
   */
  public static toSyslog(
    records: AuditRecord[],
    hostname = 'synapse-host',
    appName = 'synapse-audit'
  ): string {
    // Facility: local0 (16). Severity map: INFO(6), WARNING(4), ERROR(3), CRITICAL(2)
    const priMap: Record<string, number> = {
      INFO: 16 * 8 + 6,     // 134
      WARNING: 16 * 8 + 4,  // 132
      ERROR: 16 * 8 + 3,    // 131
      CRITICAL: 16 * 8 + 2, // 130
    };

    return records
      .map((r) => {
        const p = r.payload;
        const pri = priMap[p.severity] ?? 134;
        const ts = p.timestamp || r.createdAt;
        const procId = process.pid;
        const msgId = p.eventType;

        const structuredData = `[synapse@54321 tenantId="${p.tenantId}" seq="${r.sequence}" actorId="${p.actor.id}" category="${p.category}"]`;
        const msg = JSON.stringify({
          hash: r.hash,
          prevHash: r.prevHash,
          agentId: p.agentId,
          taskId: p.taskId,
          sessionId: p.sessionId,
          details: p.details,
        });

        return `<${pri}>1 ${ts} ${hostname} ${appName} ${procId} ${msgId} ${structuredData} ${msg}`;
      })
      .join('\n');
  }

  private static escapeCefExtension(val: string): string {
    return val.replace(/\\/g, '\\\\').replace(/=/g, '\\=').replace(/\n/g, '\\n');
  }
}
