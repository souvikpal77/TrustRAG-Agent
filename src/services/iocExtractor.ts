import { ExtractedIOC, IOCType } from '../types';

/**
 * Checks if an IPv4 address falls within RFC 5737 Documentation ranges
 * 192.0.2.0/24 (TEST-NET-1), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3)
 */
function isDocumentationIP(ip: string): boolean {
  if (ip.startsWith('192.0.2.') || ip.startsWith('198.51.100.') || ip.startsWith('203.0.113.')) {
    return true;
  }
  return false;
}

/**
 * Defangs an indicator to prevent accidental link opening or command execution
 */
export function defangIndicator(val: string, type: IOCType): string {
  if (type === 'ipv4') {
    return val.replace(/\./g, '[.]');
  }
  if (type === 'url') {
    return val.replace(/^http:/i, 'hxxp:').replace(/^https:/i, 'hxxps:').replace(/\./g, '[.]');
  }
  if (type === 'domain') {
    return val.replace(/\./g, '[.]');
  }
  return val;
}

/**
 * High-precision regex extraction for CTI indicators with context preservation
 */
export function extractIOCsFromText(text: string, docName: string = 'CTI Document'): ExtractedIOC[] {
  if (!text) return [];

  const iocs: ExtractedIOC[] = [];
  const seen = new Set<string>();

  // 1. IPv4 Regex (Standard quad-octet with boundary validation)
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  let match: RegExpExecArray | null;

  while ((match = ipRegex.exec(text)) !== null) {
    const ip = match[0];
    // Exclude localhost and common subnets if needed, or identify doc range
    if (!seen.has(ip) && ip !== '127.0.0.1' && ip !== '0.0.0.0' && !ip.startsWith('255.')) {
      seen.add(ip);
      const isDoc = isDocumentationIP(ip);
      const isInternal = ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.');
      
      const start = Math.max(0, match.index - 35);
      const end = Math.min(text.length, match.index + ip.length + 45);
      const context = text.substring(start, end).replace(/\n/g, ' ').trim();

      iocs.push({
        id: `ioc-ip-${ip.replace(/\./g, '-')}`,
        type: 'ipv4',
        value: ip,
        defangedValue: defangIndicator(ip, 'ipv4'),
        context: `...${context}...`,
        firstSeenInDoc: docName,
        threatSeverity: isDoc ? 'low' : isInternal ? 'medium' : 'high',
        reputation: isDoc ? 'documentation_range' : isInternal ? 'suspicious' : 'known_malicious'
      });
    }
  }

  // 2. URLs
  const urlRegex = /\b(?:https?|hxxps?):\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:?]/gi;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + url.length + 35);
      iocs.push({
        id: `ioc-url-${Math.random().toString(36).substring(2, 7)}`,
        type: 'url',
        value: url,
        defangedValue: defangIndicator(url, 'url'),
        context: `...${text.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: 'high',
        reputation: 'suspicious'
      });
    }
  }

  // 3. Domains (excluding pure IPs and common technical extensions)
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|edu|gov|xyz|info|biz|test|example\.org|example\.net)\b/gi;
  while ((match = domainRegex.exec(text)) !== null) {
    const domain = match[0].toLowerCase();
    if (!seen.has(domain) && !domain.endsWith('.exe') && !domain.endsWith('.txt') && !domain.endsWith('.php')) {
      seen.add(domain);
      const isDoc = domain.includes('example.') || domain.includes('.test');
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + domain.length + 35);
      iocs.push({
        id: `ioc-dom-${domain.replace(/\./g, '-')}`,
        type: 'domain',
        value: domain,
        defangedValue: defangIndicator(domain, 'domain'),
        context: `...${text.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: isDoc ? 'low' : 'high',
        reputation: isDoc ? 'documentation_range' : 'suspicious'
      });
    }
  }

  // 4. SHA-256 Hashes (64 hex characters)
  const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;
  while ((match = sha256Regex.exec(text)) !== null) {
    const hash = match[0].toLowerCase();
    if (!seen.has(hash)) {
      seen.add(hash);
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + hash.length + 35);
      iocs.push({
        id: `ioc-sha256-${hash.substring(0, 8)}`,
        type: 'sha256',
        value: hash,
        defangedValue: hash,
        context: `...${text.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: 'critical',
        reputation: 'known_malicious'
      });
    }
  }

  // 5. MD5 Hashes (32 hex characters)
  const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
  while ((match = md5Regex.exec(text)) !== null) {
    const hash = match[0].toLowerCase();
    if (!seen.has(hash)) {
      seen.add(hash);
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + hash.length + 35);
      iocs.push({
        id: `ioc-md5-${hash.substring(0, 8)}`,
        type: 'md5',
        value: hash,
        defangedValue: hash,
        context: `...${text.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: 'high',
        reputation: 'known_malicious'
      });
    }
  }

  return iocs;
}
