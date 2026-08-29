import { type PolicyContext } from "../PolicyContext.js";
import { PolicyDecision } from "../PolicyDecision.js";

export interface NetworkRuleOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  allowInternalNetwork?: boolean;
  allowMetadataEndpoints?: boolean;
  allowedPorts?: number[];
  blockedPorts?: number[];
}

const DEFAULT_BLOCKED_PORTS = [22, 23, 25, 135, 137, 138, 139, 445, 2375, 2376, 3389, 5432, 6379, 8443, 9200, 27017];

const CLOUD_METADATA_HOSTS = [
  "169.254.169.254", // AWS, Azure, OpenStack, GCP, DigitalOcean
  "metadata.google.internal", // GCP
  "metadata.goog", // GCP
  "100.100.100.200", // Alibaba Cloud
  "169.254.169.250", // Oracle Cloud
  "fd00:ec2::254", // AWS IPv6 metadata
];

export function evaluateNetworkPolicy(
  context: PolicyContext,
  options?: NetworkRuleOptions
): PolicyDecision | null {
  const urlString = extractNetworkTarget(context);
  if (!urlString) {
    return null; // Not a network request
  }

  let parsedUrl: URL;
  try {
    // Handle scheme-less URLs
    const formatted = urlString.startsWith("http://") || urlString.startsWith("https://")
      ? urlString
      : `http://${urlString}`;
    parsedUrl = new URL(formatted);
  } catch {
    return PolicyDecision.block(`Malformed URL format in network request target: ${urlString}`, {
      matchedCategory: "network",
      matchedRuleName: "net-malformed-url",
      riskLevel: "HIGH",
      violations: ["Invalid URL syntax"],
    });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : parsedUrl.protocol === "https:" ? 443 : 80;

  // 1. Check for Cloud Metadata Service access (SSRF Vector)
  if (!options?.allowMetadataEndpoints) {
    if (CLOUD_METADATA_HOSTS.includes(hostname) || hostname.endsWith("metadata.google.internal")) {
      return PolicyDecision.block(`Access to cloud instance metadata endpoint (${hostname}) is strictly blocked to prevent credential exfiltration`, {
        matchedCategory: "network",
        matchedRuleName: "net-ssrf-metadata-protection",
        riskLevel: "CRITICAL",
        violations: [`SSRF attempt against cloud metadata endpoint: ${hostname}`],
        remediation: "Never access instance metadata IP 169.254.169.254 from agent sessions.",
      });
    }
  }

  // 2. Check for Loopback & Internal RFC1918 IPs
  if (!options?.allowInternalNetwork) {
    if (isPrivateOrLoopbackHost(hostname)) {
      return PolicyDecision.block(`Access to internal/private network host (${hostname}) is blocked`, {
        matchedCategory: "network",
        matchedRuleName: "net-ssrf-private-ip-protection",
        riskLevel: "CRITICAL",
        violations: [`Target host ${hostname} resolves to loopback or RFC1918/RFC4193 private subnet`],
        remediation: "Agent network requests must target public or explicitly permitted domain whitelists.",
      });
    }
  }

  // 3. Port Restrictions
  const blockedPorts = options?.blockedPorts ?? DEFAULT_BLOCKED_PORTS;
  if (blockedPorts.includes(port)) {
    return PolicyDecision.block(`Connection to restricted network port ${port} is blocked`, {
      matchedCategory: "network",
      matchedRuleName: "net-restricted-port",
      riskLevel: "HIGH",
      violations: [`Target port ${port} is within restricted port list`],
    });
  }

  if (options?.allowedPorts && options.allowedPorts.length > 0) {
    if (!options.allowedPorts.includes(port)) {
      return PolicyDecision.block(`Connection to port ${port} is not in the allowed ports list: [${options.allowedPorts.join(", ")}]`, {
        matchedCategory: "network",
        matchedRuleName: "net-unauthorized-port",
        riskLevel: "HIGH",
        violations: [`Port ${port} not authorized`],
      });
    }
  }

  // 4. Domain Whitelist & Blacklist
  if (options?.blockedDomains && options.blockedDomains.length > 0) {
    for (const blocked of options.blockedDomains) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return PolicyDecision.block(`Domain ${hostname} is explicitly blacklisted`, {
          matchedCategory: "network",
          matchedRuleName: "net-blacklisted-domain",
          riskLevel: "CRITICAL",
          violations: [`Target domain matches blacklist: ${blocked}`],
        });
      }
    }
  }

  if (options?.allowedDomains && options.allowedDomains.length > 0) {
    const isAllowed = options.allowedDomains.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
    if (!isAllowed) {
      return PolicyDecision.requireApproval(`Network request to external domain '${hostname}' requires human approval`, {
        matchedCategory: "network",
        matchedRuleName: "net-domain-not-whitelisted",
        riskLevel: "MEDIUM",
        violations: [`Domain ${hostname} is not in current tenant whitelist`],
        remediation: "Add the domain to your tenant's network policy whitelist to allow automatic connections.",
      });
    }
  }

  return null;
}

export function isPrivateOrLoopbackHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return true;
  }

  // Decimal / Hex encoded IP addresses (e.g. 2130706433 or 0x7f000001)
  if (/^\d+$/.test(host) || /^0x[0-9a-fA-F]+$/.test(host)) {
    return true;
  }

  // IPv4 regex check
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1] ?? "0", 10);
    const octet2 = parseInt(ipv4Match[2] ?? "0", 10);

    // 127.0.0.0/8 (Loopback)
    if (octet1 === 127) return true;
    // 10.0.0.0/8 (RFC 1918)
    if (octet1 === 10) return true;
    // 172.16.0.0/12 (RFC 1918)
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
    // 192.168.0.0/16 (RFC 1918)
    if (octet1 === 192 && octet2 === 168) return true;
    // 169.254.0.0/16 (Link Local)
    if (octet1 === 169 && octet2 === 254) return true;
    // 100.64.0.0/10 (Carrier Grade NAT)
    if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return true;
    // 0.0.0.0/8
    if (octet1 === 0) return true;
  }

  // IPv6 checks
  if (host.startsWith("fe80:") || host.startsWith("fc00:") || host.startsWith("fd00:")) {
    return true;
  }

  return false;
}

function extractNetworkTarget(context: PolicyContext): string | null {
  const args = context.args;
  if (typeof args["url"] === "string") return args["url"];
  if (typeof args["Url"] === "string") return args["Url"];
  if (typeof args["host"] === "string") return args["host"];
  if (typeof args["endpoint"] === "string") return args["endpoint"];
  if (context.action === "network:request" && typeof context.target === "string" && context.target.length > 0) {
    return context.target;
  }
  return null;
}
