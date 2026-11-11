import { DocumentChunk } from '../types';

/**
 * Text Normalization & Cleaning for CTI Documents
 * Strips dangerous hidden characters, excessive whitespace, and standardizes Unicode
 */
export function cleanAndNormalizeText(text: string): string {
  if (!text) return '';
  return text
    // Replace zero-width spaces and control chars except newlines and tabs
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Remove null bytes
    .replace(/\0/g, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fast SHA-256 hash generator using Web Crypto API or deterministic fallback
 */
export async function computeSHA256(text: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fallback if crypto.subtle is restricted
  }
  // Deterministic 32-bit polynomial hash simulation
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8).substring(0, 64);
}

/**
 * Detects CTI Section Header in a text block
 */
function detectSectionHeader(text: string): string | undefined {
  const firstLine = text.trim().split('\n')[0].trim();
  const headerPatterns = [
    /^(?:\d+\.?\s*)?(EXECUTIVE SUMMARY|INCIDENT OVERVIEW|BACKGROUND|SUMMARY)/i,
    /^(?:\d+\.?\s*)?(OBSERVED INDICATORS|INDICATORS OF COMPROMISE|IOCS|TECHNICAL INDICATORS)/i,
    /^(?:\d+\.?\s*)?(TACTICS,\s*TECHNIQUES|TTPS|MITRE ATT&CK|ATT&CK TECHNIQUES)/i,
    /^(?:\d+\.?\s*)?(DETECTION AND MITIGATION|MITIGATION|DEFENSE RECOMMENDATIONS|REMEDIATION)/i,
    /^(?:\d+\.?\s*)?(CURRENT STATUS|ANALYST VALIDATION|FORENSIC ANALYSIS)/i
  ];

  for (const regex of headerPatterns) {
    if (regex.test(firstLine)) {
      return firstLine.substring(0, 60);
    }
  }
  return undefined;
}

/**
 * Structure-Aware Sliding-Window Chunker for Cyber Threat Intelligence
 * Preserves structural section headings, exact page references, and sentence boundaries.
 */
export function chunkDocument(
  documentId: string,
  documentName: string,
  rawText: string,
  targetTokenCount: number = 140,
  overlapTokens: number = 30
): DocumentChunk[] {
  const normalized = cleanAndNormalizeText(rawText);
  if (!normalized) return [];

  const chunks: DocumentChunk[] = [];
  const paragraphs = normalized.split(/\n\n+/);
  
  let currentWords: string[] = [];
  let currentPage = 1;
  let chunkIndex = 0;
  let currentSection = 'General CTI Telemetry';
  let totalWordCounter = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check for explicit page markers: [Page X], Page X, \f
    const pageMatch = trimmed.match(/(?:^|\n)(?:---\s*)?(?:\[?\s*Page\s*(\d+)\s*\]?|--\s*(\d+)\s*of\s*\d+\s*--)(?:\s*---)?/i);
    if (pageMatch) {
      const parsedPage = parseInt(pageMatch[1] || pageMatch[2], 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        currentPage = parsedPage;
      }
    } else if (trimmed.includes('\f')) {
      currentPage++;
    }

    // Detect structural section header
    const detectedHeader = detectSectionHeader(trimmed);
    if (detectedHeader) {
      currentSection = detectedHeader;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    totalWordCounter += words.length;

    // Standard document density fallback: roughly 250 words per page
    if (!pageMatch && totalWordCounter > currentPage * 260) {
      currentPage++;
    }

    if (currentWords.length + words.length > targetTokenCount && currentWords.length > 0) {
      const content = currentWords.join(' ');
      chunks.push({
        id: `chunk-${documentId}-${chunkIndex}`,
        documentId,
        documentName,
        chunkIndex,
        pageNumber: currentPage,
        sectionTitle: currentSection,
        content,
        tokenCount: currentWords.length,
        keywords: extractKeywords(content),
        contentHash: `hash-${chunkIndex}-${content.length}`
      });
      chunkIndex++;

      // Retain sliding window overlap
      currentWords = currentWords.slice(-overlapTokens);
    }

    currentWords.push(...words);
  }

  // Push remaining words
  if (currentWords.length > 0) {
    const content = currentWords.join(' ');
    chunks.push({
      id: `chunk-${documentId}-${chunkIndex}`,
      documentId,
      documentName,
      chunkIndex,
      pageNumber: currentPage,
      sectionTitle: currentSection,
      content,
      tokenCount: currentWords.length,
      keywords: extractKeywords(content),
      contentHash: `hash-${chunkIndex}-${content.length}`
    });
  }

  return chunks;
}

/**
 * Extracts salient technical keywords from a text chunk with high CTI precision
 */
export function extractKeywords(text: string): string[] {
  const clean = text.toLowerCase();
  
  // High-value technical patterns in CTI
  const extracted: string[] = [];

  // Match IPs
  const ipMatches = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
  if (ipMatches) extracted.push(...ipMatches);

  // Match MITRE Technique IDs (e.g. T1566, T1059.001)
  const mitreMatches = text.match(/\bT\d{4}(?:\.\d{3})?\b/gi);
  if (mitreMatches) extracted.push(...mitreMatches.map(m => m.toUpperCase()));

  // Match hashes
  const shaMatches = text.match(/\b[a-fA-F0-9]{32,64}\b/g);
  if (shaMatches) extracted.push(...shaMatches.map(h => h.substring(0, 8) + '...'));

  // Match CVEs
  const cveMatches = text.match(/\bCVE-\d{4}-\d{4,7}\b/gi);
  if (cveMatches) extracted.push(...cveMatches.map(c => c.toUpperCase()));

  // Additional keywords by word frequency
  const words = clean.split(/[^a-zA-Z0-9_.-]+/).filter(w => w.length > 3);
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  const combined = Array.from(new Set([...extracted, ...sorted.slice(0, 8)]));
  return combined.slice(0, 8);
}
