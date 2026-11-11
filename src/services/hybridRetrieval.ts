import { DocumentChunk, RetrievalResult } from '../types';

/**
 * Normalizes defanged technical indicators in queries and text
 */
function normalizeDefanging(text: string): string {
  return text
    .replace(/\[\.\]/g, '.')
    .replace(/hxxp/gi, 'http')
    .replace(/\[:\]/g, ':')
    .replace(/\[\/\/\]/g, '//');
}

/**
 * Tokenizes text into lowercase terms, preserving technical identifiers like IPs, ports, and CVEs
 */
function tokenize(text: string): string[] {
  const normalized = normalizeDefanging(text);
  return normalized
    .toLowerCase()
    .replace(/[^\w\d.:/-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Calculates term weight with boosts for technical cybersecurity indicators
 */
function getTermImportance(term: string): number {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(term)) return 4.0; // IPv4
  if (/^t\d{4}(\.\d{3})?$/i.test(term)) return 3.5; // MITRE Technique ID
  if (/^[a-f0-9]{32,64}$/i.test(term)) return 3.5; // Hashes
  if (term.includes('cve-')) return 3.5;
  if (['phishing', 'ransomware', 'c2', 'beacon', 'exploit', 'exfiltration', 'powershell', 'malware'].includes(term)) {
    return 2.4;
  }
  return 1.0;
}

/**
 * Extracts matched technical entities (IPs, domains, hashes, CVEs)
 */
function extractMatchingEntities(queryTerms: string[], chunkText: string): string[] {
  const normChunk = normalizeDefanging(chunkText).toLowerCase();
  const entities: string[] = [];

  for (const q of queryTerms) {
    if (getTermImportance(q) > 1.5 && normChunk.includes(q)) {
      entities.push(q);
    }
  }

  // Also check if any IP in chunk was asked
  const ipMatch = chunkText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
  if (ipMatch) {
    ipMatch.forEach(ip => {
      if (queryTerms.some(q => q.includes('ip') || q === ip)) {
        entities.push(ip);
      }
    });
  }

  return Array.from(new Set(entities)).slice(0, 5);
}

/**
 * BM25-style keyword matching score
 */
function computeBM25Score(queryTerms: string[], chunk: DocumentChunk): { score: number; matchedTerms: string[] } {
  const contentLower = normalizeDefanging(chunk.content).toLowerCase();
  const chunkTerms = tokenize(chunk.content);
  const chunkLength = chunkTerms.length || 1;
  const avgDocLength = 120; // Target baseline chunk size

  const k1 = 1.2;
  const b = 0.75;
  let score = 0;
  const matchedTerms: string[] = [];

  for (const q of queryTerms) {
    const importance = getTermImportance(q);
    const termCount = chunkTerms.filter(t => t === q || t.includes(q)).length;
    
    if (termCount > 0) {
      matchedTerms.push(q);
      const tfNumerator = termCount * (k1 + 1);
      const tfDenominator = termCount + k1 * (1 - b + b * (chunkLength / avgDocLength));
      score += importance * (tfNumerator / tfDenominator);
    } else if (contentLower.includes(q)) {
      matchedTerms.push(q);
      score += importance * 0.6;
    }
  }

  // Normalize score between 0 and 1
  const maxPossibleScore = queryTerms.reduce((sum, q) => sum + getTermImportance(q) * (k1 + 1), 0);
  const normalized = maxPossibleScore > 0 ? Math.min(1.0, score / (maxPossibleScore * 0.75)) : 0;

  return { score: normalized, matchedTerms };
}

/**
 * Multi-scale n-gram semantic vector similarity
 */
function computeSemanticScore(query: string, chunk: DocumentChunk): number {
  const normQuery = normalizeDefanging(query).toLowerCase();
  const normContent = normalizeDefanging(chunk.content).toLowerCase();

  const query3grams = getCharacterNgrams(normQuery, 3);
  const chunk3grams = getCharacterNgrams(normContent, 3);

  if (query3grams.size === 0 || chunk3grams.size === 0) return 0;

  let intersection = 0;
  for (const gram of query3grams) {
    if (chunk3grams.has(gram)) {
      intersection++;
    }
  }

  const denominator = Math.sqrt(query3grams.size) * Math.sqrt(chunk3grams.size);
  let cosine = denominator > 0 ? intersection / denominator : 0;

  // Boost if section title aligns with query intention
  if (chunk.sectionTitle) {
    const secLower = chunk.sectionTitle.toLowerCase();
    if (
      (normQuery.includes('indicator') || normQuery.includes('ip') || normQuery.includes('hash')) && secLower.includes('indicator') ||
      (normQuery.includes('technique') || normQuery.includes('mitre') || normQuery.includes('ttp')) && secLower.includes('technique') ||
      (normQuery.includes('activity') || normQuery.includes('incident') || normQuery.includes('executive')) && (secLower.includes('summary') || secLower.includes('overview'))
    ) {
      cosine = Math.min(1.0, cosine * 1.25);
    }
  }

  return Math.min(1.0, Math.round(cosine * 100) / 100 * 1.35);
}

function getCharacterNgrams(text: string, n: number = 3): Set<string> {
  const grams = new Set<string>();
  const sanitized = text.replace(/\s+/g, ' ');
  for (let i = 0; i <= sanitized.length - n; i++) {
    grams.add(sanitized.substring(i, i + n));
  }
  return grams;
}

/**
 * Extracts snippet highlight surrounding matching terms
 */
function extractHighlights(content: string, matchedTerms: string[]): string[] {
  if (matchedTerms.length === 0) {
    return [content.substring(0, 160) + '...'];
  }

  const highlights: string[] = [];
  const lower = content.toLowerCase();

  for (const term of matchedTerms.slice(0, 2)) {
    const index = lower.indexOf(term);
    if (index !== -1) {
      const start = Math.max(0, index - 40);
      const end = Math.min(content.length, index + term.length + 50);
      let snippet = content.substring(start, end).trim();
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
      highlights.push(snippet);
    }
  }

  return highlights.length > 0 ? highlights : [content.substring(0, 150) + '...'];
}

/**
 * Primary Hybrid Retrieval Engine (Souvik Pal - Module 2)
 */
export function performHybridRetrieval(
  query: string,
  chunks: DocumentChunk[],
  options?: {
    topK?: number;
    semanticWeight?: number;
    keywordWeight?: number;
    selectedDocIds?: string[];
  }
): RetrievalResult[] {
  if (!query || chunks.length === 0) return [];

  const topK = options?.topK ?? 5;
  const semanticWeight = options?.semanticWeight ?? 0.50;
  const keywordWeight = options?.keywordWeight ?? 0.50;
  const filteredChunks = options?.selectedDocIds && options.selectedDocIds.length > 0
    ? chunks.filter(c => options.selectedDocIds!.includes(c.documentId))
    : chunks;

  const queryTerms = tokenize(query);

  const results: RetrievalResult[] = filteredChunks.map(chunk => {
    const { score: keywordScore, matchedTerms } = computeBM25Score(queryTerms, chunk);
    const semanticScore = computeSemanticScore(query, chunk);
    const hybridScore = Math.min(1.0, (semanticWeight * semanticScore) + (keywordWeight * keywordScore));

    const matchedEntities = extractMatchingEntities(queryTerms, chunk.content);

    let relevanceTier: 'HIGH' | 'MODERATE' | 'MARGINAL' = 'MARGINAL';
    if (hybridScore >= 0.70) relevanceTier = 'HIGH';
    else if (hybridScore >= 0.40) relevanceTier = 'MODERATE';

    return {
      chunk,
      semanticScore: Math.round(semanticScore * 100) / 100,
      keywordScore: Math.round(keywordScore * 100) / 100,
      hybridScore: Math.round(hybridScore * 100) / 100,
      relevanceTier,
      matchedEntities,
      matchHighlights: extractHighlights(chunk.content, matchedTerms),
      retrievalMethod: 'hybrid'
    };
  });

  // Rank by hybrid score descending
  results.sort((a, b) => b.hybridScore - a.hybridScore);

  return results.slice(0, topK);
}
