/**
 * @file LogImporter.ts
 * @description Ingests structured JSON and semi-structured log streams, parsing them into discrete state change events and telemetry events.
 */
import { WorldEvent } from '../model/Event.js';
export class LogImporter {
    // Regex for Common Log Format (Apache/Nginx)
    static CLF_REGEX = /^(\S+) \S+ \S+ \[([\w:/]+\s[+\-]\d{4})\] "(\S+)\s?(\S+)?\s?(\S+)?" (\d{3}) (\d+|-)/;
    // Regex for Syslog RFC 5424 / 3164
    static SYSLOG_REGEX = /^<(\d{1,3})>(?:(\d)\s+)?(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(?:(\S+)\s+)?(.*)$/;
    /**
     * Parses log stream text into structured log entries.
     */
    static parseLogStream(logText, format = 'auto') {
        const lines = logText.split('\n');
        const entries = [];
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line)
                continue;
            const detectedFormat = format === 'auto' ? this.detectFormat(line) : format;
            const parsed = this.parseLine(line, detectedFormat);
            if (parsed) {
                entries.push(parsed);
            }
        }
        return entries;
    }
    /**
     * Converts parsed log entries into WorldEvents.
     */
    static logsToWorldEvents(logs, source = 'LogImporter') {
        return logs.map((log) => {
            let eventType = 'telemetry.log';
            if (log.level === 'error' || log.level === 'fatal') {
                eventType = 'system.drift_detected';
            }
            return new WorldEvent({
                type: eventType,
                source: log.serviceName ?? source,
                timestamp: log.timestamp,
                entityId: log.entityId,
                correlationId: log.traceId,
                payload: {
                    level: log.level,
                    message: log.message,
                    service: (log.serviceName ?? 'unknown'),
                    ...log.attributes,
                },
            });
        });
    }
    static detectFormat(line) {
        if (line.startsWith('{') && line.endsWith('}'))
            return 'json';
        if (line.startsWith('<'))
            return 'syslog';
        if (this.CLF_REGEX.test(line))
            return 'common_log';
        if (line.includes('=') && !line.includes('{'))
            return 'logfmt';
        return 'json';
    }
    static parseLine(line, format) {
        switch (format) {
            case 'json':
                return this.parseJSONLog(line);
            case 'logfmt':
                return this.parseLogfmt(line);
            case 'common_log':
                return this.parseCommonLog(line);
            case 'syslog':
                return this.parseSyslog(line);
            default:
                return this.parseJSONLog(line);
        }
    }
    static parseJSONLog(line) {
        try {
            const obj = JSON.parse(line);
            const rawTimestamp = obj['timestamp'] ?? obj['time'] ?? obj['@timestamp'] ?? Date.now();
            const timestamp = typeof rawTimestamp === 'number' ? rawTimestamp : new Date(String(rawTimestamp)).getTime() || Date.now();
            const rawLevel = String(obj['level'] ?? obj['severity'] ?? obj['status'] ?? 'info').toLowerCase();
            const level = this.normalizeLevel(rawLevel);
            const message = String(obj['message'] ?? obj['msg'] ?? obj['log'] ?? line);
            const serviceName = (obj['service'] ?? obj['app'] ?? obj['serviceName']);
            const traceId = (obj['traceId'] ?? obj['trace_id'] ?? obj['correlationId']);
            const spanId = (obj['spanId'] ?? obj['span_id']);
            const entityId = (obj['entityId'] ?? obj['entity_id'] ?? obj['nodeId']);
            const attributes = {};
            for (const [k, v] of Object.entries(obj)) {
                if (!['timestamp', 'time', '@timestamp', 'level', 'severity', 'message', 'msg'].includes(k)) {
                    attributes[k] = v;
                }
            }
            return {
                timestamp,
                level,
                message,
                serviceName,
                traceId,
                spanId,
                entityId,
                attributes,
                raw: line,
            };
        }
        catch {
            return {
                timestamp: Date.now(),
                level: 'info',
                message: line,
                attributes: {},
                raw: line,
            };
        }
    }
    static parseLogfmt(line) {
        const attributes = {};
        const regex = /([a-zA-Z0-9_.-]+)=(?:"([^"]*)"|(\S+))/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const key = match[1];
            const val = match[2] ?? match[3] ?? '';
            attributes[key] = isNaN(Number(val)) ? val : Number(val);
        }
        const message = (attributes['msg'] ?? attributes['message'] ?? line);
        const rawLevel = String(attributes['level'] ?? 'info').toLowerCase();
        const level = this.normalizeLevel(rawLevel);
        return {
            timestamp: Date.now(),
            level,
            message,
            serviceName: attributes['service'],
            traceId: attributes['trace_id'],
            entityId: attributes['entity_id'],
            attributes,
            raw: line,
        };
    }
    static parseCommonLog(line) {
        const match = this.CLF_REGEX.exec(line);
        if (!match)
            return null;
        const [, ip, timeStr, method, url, , statusCode, bytes] = match;
        const timestamp = new Date(timeStr?.replace(':', ' ') ?? Date.now()).getTime() || Date.now();
        const status = Number(statusCode ?? 200);
        return {
            timestamp,
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            message: `${method} ${url} HTTP ${status}`,
            attributes: {
                clientIp: (ip ?? ''),
                httpMethod: (method ?? ''),
                url: (url ?? ''),
                statusCode: status,
                bytesSent: (bytes === '-' ? 0 : Number(bytes)),
            },
            raw: line,
        };
    }
    static parseSyslog(line) {
        const match = this.SYSLOG_REGEX.exec(line);
        if (!match)
            return null;
        const [, pri, , timeStr, host, appName, , , msg] = match;
        const priority = Number(pri ?? 13);
        const severityCode = priority % 8;
        let level = 'info';
        if (severityCode <= 2)
            level = 'fatal';
        else if (severityCode === 3)
            level = 'error';
        else if (severityCode === 4)
            level = 'warn';
        else if (severityCode === 5 || severityCode === 6)
            level = 'info';
        else
            level = 'debug';
        const timestamp = timeStr ? new Date(timeStr).getTime() || Date.now() : Date.now();
        return {
            timestamp,
            level,
            message: msg ?? line,
            serviceName: appName || host,
            attributes: {
                host: (host ?? ''),
                syslogPriority: priority,
            },
            raw: line,
        };
    }
    static normalizeLevel(raw) {
        if (['fatal', 'crit', 'critical', 'panic', 'emerg', 'emergency'].includes(raw))
            return 'fatal';
        if (['err', 'error'].includes(raw))
            return 'error';
        if (['warn', 'warning'].includes(raw))
            return 'warn';
        if (['debug'].includes(raw))
            return 'debug';
        if (['trace', 'verbose', 'silly'].includes(raw))
            return 'trace';
        return 'info';
    }
}
//# sourceMappingURL=LogImporter.js.map