export type DocumentType = 
  | 'incident_report'
  | 'threat_actor_profile'
  | 'malware_analysis'
  | 'security_advisory'
  | 'forensic_telemetry';

export type IngestionStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export type TLPClassification = 'WHITE' | 'GREEN' | 'AMBER' | 'RED';

export interface CTIDocument {
  id: string;
  filename: string;
  source: string;
  publicationDate: string;
  documentType: DocumentType;
  ingestionStatus: IngestionStatus;
  contentHash: string; // SHA-256
  rawText: string;
  isSample: boolean; // Explicit academic labeling
  fileSize: number;
  uploadedAt: string;
  author: string;
  tlp: TLPClassification;
  chunkCount: number;
  summary?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  tokenCount: number;
  keywords: string[];
  contentHash: string;
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  semanticScore: number;
  keywordScore: number;
  hybridScore: number;
  relevanceTier: 'HIGH' | 'MODERATE' | 'MARGINAL';
  matchedEntities: string[];
  matchHighlights: string[];
  retrievalMethod: 'hybrid' | 'semantic' | 'bm25_keyword';
}

export type ClaimStatus = 'SUPPORTED' | 'CONTRADICTED' | 'UNRESOLVED';

export interface ClaimVerification {
  id: string;
  claimText: string;
  status: ClaimStatus;
  confidence: number; // 0 - 100
  supportingEvidence: string[];
  contradictingEvidence: string[];
  citation: {
    documentName: string;
    pageNumber: number;
    chunkIndex: number;
  };
  rationale: string;
}

export interface TrustFactorDetail {
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  label: string;
  notes: string;
}

export interface TrustAssessment {
  overallScore: number; // 0 - 100
  riskLevel: 'HIGH_TRUST' | 'MODERATE_TRUST' | 'LOW_TRUST' | 'UNVERIFIED';
  factors: {
    provenance: TrustFactorDetail;
    authority: TrustFactorDetail;
    relevance: TrustFactorDetail;
    entailment: TrustFactorDetail;
    freshness: TrustFactorDetail;
    modelConfidence: TrustFactorDetail;
  };
  abstentionTriggered: boolean;
  abstentionReason: string | null;
  flaggedForHumanReview: boolean;
  experimentalDisclaimer: string;
}

export type IOCType = 'ipv4' | 'domain' | 'url' | 'sha256' | 'sha1' | 'md5';

export interface ExtractedIOC {
  id: string;
  type: IOCType;
  value: string;
  defangedValue: string;
  context: string;
  firstSeenInDoc: string;
  threatSeverity: 'low' | 'medium' | 'high' | 'critical';
  reputation: 'known_malicious' | 'suspicious' | 'documentation_range' | 'unverified';
}

export interface MITREMapping {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  candidateEvidence: string;
  status: 'CANDIDATE_REQUIRES_ANALYST_VALIDATION' | 'SUPPORTED_BY_EVIDENCE' | 'HYPOTHESIS';
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalysisQueryRecord {
  id: string;
  query: string;
  timestamp: string;
  documentIds: string[];
  retrievedChunks: RetrievalResult[];
  answer: string;
  citations: Array<{
    documentName: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    quote: string;
  }>;
  claims: ClaimVerification[];
  trustAssessment: TrustAssessment;
  iocs: ExtractedIOC[];
  mitreMappings: MITREMapping[];
  latencyMs: number;
  modelUsed: string;
  threatFlags?: string[];
}

export interface MetricSummary {
  relevance: number;
  citationSupport: number;
  unsupportedClaims: number;
  verificationScore: number;
  iocPrecision: number;
  mitreQuality: number;
  latencyMs: number;
}

export interface EvaluationBenchmark {
  id: string;
  category: string;
  question: string;
  targetDocId: string;
  groundTruthSummary: string;
  status: 'evaluated' | 'pending';
  results: {
    standaloneLLM: MetricSummary;
    standardRAG: MetricSummary;
    trustRAGAgent: MetricSummary;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  securityStatus: 'NORMAL' | 'WARNING' | 'SUSPICIOUS_PROMPT_BLOCKED';
}

export interface TeamMember {
  name: string;
  role: string;
  focusArea: string;
  responsibilities: string[];
  moduleName: string;
  moduleBadge: string;
  pipelineStage: number;
}

export interface TrustWeights {
  provenance: number;
  authority: number;
  relevance: number;
  entailment: number;
  freshness: number;
  modelConfidence: number;
}
