import { AuditLogEntry, ClaimVerification, RetrievalResult } from '../types';

export interface GenerateResponse {
  answer: string;
  model: string;
  mode: string;
  evidenceCount: number;
  threatFlags?: string[];
  note?: string;
}

export interface VerifyResponse {
  claims: ClaimVerification[];
  mode: string;
}

export async function checkServerHealth(): Promise<{
  status: string;
  framework: string;
  geminiConfigured: boolean;
  model: string;
}> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check returned non-200');
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      framework: 'TrustRAG-Agent',
      geminiConfigured: false,
      model: 'gemini-3.8-flash'
    };
  }
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const res = await fetch('/api/audit');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.warn('Error fetching audit logs:', err);
    return [];
  }
}

export async function recordAuditLog(
  action: string,
  details: string,
  actor: string = 'SecurityAnalyst',
  securityStatus: 'NORMAL' | 'WARNING' | 'SUSPICIOUS_PROMPT_BLOCKED' = 'NORMAL'
): Promise<void> {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details, actor, securityStatus })
    });
  } catch (err) {
    console.warn('Failed to record audit log:', err);
  }
}

export async function generateGroundedAnswer(
  query: string,
  evidence: RetrievalResult[]
): Promise<GenerateResponse> {
  const payload = {
    query,
    evidence: evidence.map(e => ({
      documentName: e.chunk.documentName,
      chunkIndex: e.chunk.chunkIndex,
      content: e.chunk.content
    }))
  };

  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error ${res.status}`);
  }

  return await res.json();
}

export async function verifyClaimsWithAPI(
  answer: string,
  evidence: RetrievalResult[]
): Promise<VerifyResponse> {
  const payload = {
    answer,
    evidence: evidence.map(e => ({
      documentName: e.chunk.documentName,
      chunkIndex: e.chunk.chunkIndex,
      content: e.chunk.content
    }))
  };

  const res = await fetch('/api/gemini/verify-claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error ${res.status}`);
  }

  return await res.json();
}

export async function parsePdfDocument(
  base64: string,
  filename: string
): Promise<{ success: boolean; extractedText: string; pageCount: number; sizeBytes: number }> {
  const res = await fetch('/api/documents/parse-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, filename })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to parse PDF document');
  }

  return await res.json();
}
