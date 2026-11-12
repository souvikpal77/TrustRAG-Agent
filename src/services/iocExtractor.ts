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

function stableHash(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(36);
}

/**
 * High-precision regex extraction for CTI indicators with defang normalization and context preservation
 */
export function extractIOCsFromText(text: string, docName: string = 'CTI Document'): ExtractedIOC[] {
  if (!text) return [];

  // Normalize common CTI defanging notations so both live and defanged indicators are captured
  const normalizedText = text
    .replace(/\[\.\]/g, '.')
    .replace(/\(\.\)/g, '.')
    .replace(/hxxps:\/\//gi, 'https://')
    .replace(/hxxp:\/\//gi, 'http://')
    .replace(/\[:\]/g, ':');

  const iocs: ExtractedIOC[] = [];
  const seen = new Set<string>();

  // 1. IPv4 Regex (Standard quad-octet with boundary validation)
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  let match: RegExpExecArray | null;

  while ((match = ipRegex.exec(normalizedText)) !== null) {
    const ip = match[0];
    // Exclude loopback, unspecified, and broadcast masks
    if (!seen.has(ip) && ip !== '127.0.0.1' && ip !== '0.0.0.0' && !ip.startsWith('255.')) {
      seen.add(ip);
      const isDoc = isDocumentationIP(ip);
      const isInternal = ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip);

      const start = Math.max(0, match.index - 35);
      const end = Math.min(normalizedText.length, match.index + ip.length + 45);
      const context = normalizedText.substring(start, end).replace(/\n/g, ' ').trim();
      const hasSuspiciousContext = /c2|beacon|malicious|exfil|staging|command|suspicious|dropper|botnet/i.test(context);

      iocs.push({
        id: `ioc-ip-${ip.replace(/\./g, '-')}`,
        type: 'ipv4',
        value: ip,
        defangedValue: defangIndicator(ip, 'ipv4'),
        context: `...${context}...`,
        firstSeenInDoc: docName,
        threatSeverity: isDoc ? 'low' : isInternal ? 'medium' : hasSuspiciousContext ? 'high' : 'medium',
        reputation: isDoc ? 'documentation_range' : hasSuspiciousContext || isInternal ? 'suspicious' : 'unverified'
      });
    }
  }

  // 2. URLs
  const urlRegex = /\bhttps?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:?)]/gi;
  while ((match = urlRegex.exec(normalizedText)) !== null) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      const isDoc = url.includes('example.') || url.includes('.test');
      const start = Math.max(0, match.index - 30);
      const end = Math.min(normalizedText.length, match.index + url.length + 35);
      iocs.push({
        id: `ioc-url-${stableHash(url)}`,
        type: 'url',
        value: url,
        defangedValue: defangIndicator(url, 'url'),
        context: `...${normalizedText.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: isDoc ? 'low' : 'high',
        reputation: isDoc ? 'documentation_range' : 'suspicious'
      });
    }
  }

  // 3. Domains (excluding pure IPs and common file extensions)
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|edu|gov|xyz|info|biz|test|example\.org|example\.net)\b/gi;
  while ((match = domainRegex.exec(normalizedText)) !== null) {
    const domain = match[0].toLowerCase();
    if (!seen.has(domain) && !domain.endsWith('.exe') && !domain.endsWith('.txt') && !domain.endsWith('.php') && !domain.endsWith('.pdf')) {
      seen.add(domain);
      const isDoc = domain.includes('example.') || domain.includes('.test');
      const start = Math.max(0, match.index - 30);
      const end = Math.min(normalizedText.length, match.index + domain.length + 35);
      iocs.push({
        id: `ioc-dom-${domain.replace(/\./g, '-')}`,
        type: 'domain',
        value: domain,
        defangedValue: defangIndicator(domain, 'domain'),
        context: `...${normalizedText.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: isDoc ? 'low' : 'medium',
        reputation: isDoc ? 'documentation_range' : 'unverified'
      });
    }
  }

  // 4. SHA-256 Hashes (64 hex characters)
  const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;
  while ((match = sha256Regex.exec(normalizedText)) !== null) {
    const hash = match[0].toLowerCase();
    if (!seen.has(hash)) {
      seen.add(hash);
      const start = Math.max(0, match.index - 30);
      const end = Math.min(normalizedText.length, match.index + hash.length + 35);
      const context = normalizedText.substring(start, end).replace(/\n/g, ' ').trim();
      const isMalwareCtx = /dropper|malware|encryptor|ransom|payload|loader/i.test(context);
      iocs.push({
        id: `ioc-sha256-${hash.substring(0, 8)}`,
        type: 'sha256',
        value: hash,
        defangedValue: hash,
        context: `...${context}...`,
        firstSeenInDoc: docName,
        threatSeverity: isMalwareCtx ? 'high' : 'medium',
        reputation: isMalwareCtx ? 'suspicious' : 'unverified'
      });
    }
  }

  // 5. SHA-1 Hashes (40 hex characters)
  const sha1Regex = /\b[a-fA-F0-9]{40}\b/g;
  while ((match = sha1Regex.exec(normalizedText)) !== null) {
    const hash = match[0].toLowerCase();
    if (!seen.has(hash)) {
      seen.add(hash);
      const start = Math.max(0, match.index - 30);
      const end = Math.min(normalizedText.length, match.index + hash.length + 35);
      iocs.push({
        id: `ioc-sha1-${hash.substring(0, 8)}`,
        type: 'sha1',
        value: hash,
        defangedValue: hash,
        context: `...${normalizedText.substring(start, end).replace(/\n/g, ' ').trim()}...`,
        firstSeenInDoc: docName,
        threatSeverity: 'medium',
        reputation: 'unverified'
      });
    }
  }

  // 6. MD5 Hashes (32 hex characters)
  const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
  while ((match = md5Regex.exec(normalizedText)) !== null) {
    const hash = match[0].toLowerCase();
    if (!seen.has(hash)) {
      seen.add(hash);
      const start = Math.max(0, match.index - 30);
      const end = Math.min(normalizedText.length, match.index + hash.length + 35);
      const context = normalizedText.substring(start, end).replace(/\n/g, ' ').trim();
      iocs.push({
        id: `ioc-md5-${hash.substring(0, 8)}`,
        type: 'md5',
        value: hash,
        defangedValue: hash,
        context: `...${context}...`,
        firstSeenInDoc: docName,
        threatSeverity: 'medium',
        reputation: 'unverified'
      });
    }
  }

  return iocs;
}
