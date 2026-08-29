/**
 * @file LogImporter.ts
 * @description Ingests structured JSON and semi-structured log streams, parsing them into discrete state change events and telemetry events.
 */
import { WorldEvent } from '../model/Event.js';
import type { PropertyValue } from '../model/State.js';
export type LogFormat = 'json' | 'syslog' | 'common_log' | 'logfmt' | 'auto';
export interface ParsedLogEntry {
    readonly timestamp: number;
    readonly level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    readonly message: string;
    readonly serviceName?: string;
    readonly traceId?: string;
    readonly spanId?: string;
    readonly entityId?: string;
    readonly attributes: Record<string, PropertyValue>;
    readonly raw: string;
}
export declare class LogImporter {
    private static readonly CLF_REGEX;
    private static readonly SYSLOG_REGEX;
    /**
     * Parses log stream text into structured log entries.
     */
    static parseLogStream(logText: string, format?: LogFormat): ParsedLogEntry[];
    /**
     * Converts parsed log entries into WorldEvents.
     */
    static logsToWorldEvents(logs: ParsedLogEntry[], source?: string): WorldEvent[];
    private static detectFormat;
    private static parseLine;
    private static parseJSONLog;
    private static parseLogfmt;
    private static parseCommonLog;
    private static parseSyslog;
    private static normalizeLevel;
}
//# sourceMappingURL=LogImporter.d.ts.map