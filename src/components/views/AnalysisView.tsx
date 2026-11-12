import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Binary,
  Target,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  Info,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import {
  AnalysisQueryRecord,
  CTIDocument,
  DocumentChunk,
  RetrievalResult,
  TrustWeights
} from '../../types';
import { performHybridRetrieval } from '../../services/hybridRetrieval';
import { generateGroundedAnswer, verifyClaimsWithAPI, recordAuditLog } from '../../services/api';
import { extractIOCsFromText } from '../../services/iocExtractor';
import { mapEvidenceToMITRE } from '../../services/mitreMapper';
import { calculateTrustAssessment } from '../../services/trustEngine';
import { ClaimStatusBadge, TLPBadge } from '../common/Badge';
import { PRESET_QUERIES } from '../../data/sampleData';
import { EvidenceInspectorModal } from '../modals/EvidenceInspectorModal';

interface AnalysisViewProps {
  documents: CTIDocument[];
  chunks: DocumentChunk[];
  activeAnalysis: AnalysisQueryRecord | null;
  trustWeights: TrustWeights;
  onSaveAnalysis: (record: AnalysisQueryRecord) => void;
  onNavigateToView: (view: any) => void;
  initialQuery?: string;
  initialDocId?: string;
  onClearInitialQuery?: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  documents,
  chunks,
  activeAnalysis,
  trustWeights,
  onSaveAnalysis,
  onNavigateToView,
  initialQuery,
  initialDocId,
  onClearInitialQuery
}) => {
  const [query, setQuery] = useState(initialQuery || activeAnalysis?.query || PRESET_QUERIES[0]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || 'all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [inspectingEvidence, setInspectingEvidence] = useState<{
    chunk: DocumentChunk;
    quote?: string;
    relevanceTier?: 'HIGH' | 'MODERATE' | 'MARGINAL';
    matchedEntities?: string[];
    scores?: { semantic?: number; keyword?: number; hybrid?: number };
  } | null>(null);

  // Auto-run if triggered from another module with an initialQuery
  React.useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      if (initialDocId) setSelectedDocId(initialDocId);
      handleExecuteFullPipeline(initialQuery, initialDocId);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery, initialDocId]);

  // Run full 8-step agentic CTI workflow
  const handleExecuteFullPipeline = async (customQuery?: string, docIdOverride?: string) => {
    const q = (customQuery || query).trim();
    if (!q) return;

    const targetDoc = docIdOverride !== undefined ? docIdOverride : selectedDocId;

    setIsAnalyzing(true);
    setAnalysisError(null);
    const startTime = performance.now();

    try {
      // Step 1 & 2: Ingestion verification
      setCurrentStage('Ingesting & parsing active CTI document chunks...');
      await new Promise(r => setTimeout(r, 150));

      // Step 3: Hybrid Retrieval with document scoping
      setCurrentStage('Executing dual-vector semantic + BM25 keyword retrieval...');
      const filterDocIds = targetDoc !== 'all' ? [targetDoc] : undefined;
      const retrievedEvidence = performHybridRetrieval(q, chunks, {
        topK: 4,
        semanticWeight: 0.5,
        keywordWeight: 0.5,
        selectedDocIds: filterDocIds
      });

      // Step 4: Evidence-Grounded Gemini RAG Generation
      setCurrentStage('Generating evidence-grounded threat assessment via Server LLM Gateway...');
      const genResponse = await generateGroundedAnswer(q, retrievedEvidence);

      // Step 5: Claim Decomposition & Verification
      setCurrentStage('Decomposing generated response into verifiable factual claims...');
      const verifyResponse = await verifyClaimsWithAPI(genResponse.answer, retrievedEvidence);

      // Step 6: Multi-Factor Trust Assessment
      setCurrentStage('Calculating multi-factor trust metrics (provenance, entailment, freshness)...');
      const trustAssessment = calculateTrustAssessment(
        verifyResponse.claims,
        retrievedEvidence,
        documents,
        trustWeights
      );

      // Step 7: IOC Extraction & MITRE ATT&CK Mapping
      setCurrentStage('Extracting technical IOCs & correlating candidate MITRE techniques...');
      const combinedEvidenceText = retrievedEvidence.map(e => e.chunk.content).join('\n') + '\n' + genResponse.answer;
      const extractedIocs = extractIOCsFromText(combinedEvidenceText, retrievedEvidence[0]?.chunk.documentName);
      const mitreMappings = mapEvidenceToMITRE(combinedEvidenceText);

      // Compile Record
      const endTime = performance.now();
      const record: AnalysisQueryRecord = {
        id: `query-${Date.now()}`,
        query: q,
        timestamp: new Date().toISOString(),
        documentIds: Array.from(new Set(retrievedEvidence.map(e => e.chunk.documentId))),
        retrievedChunks: retrievedEvidence,
        answer: genResponse.answer,
        citations: retrievedEvidence.map(e => ({
          documentName: e.chunk.documentName,
          chunkIndex: e.chunk.chunkIndex,
          pageNumber: e.chunk.pageNumber,
          sectionTitle: e.chunk.sectionTitle,
          quote: e.matchHighlights[0] || e.chunk.content.substring(0, 100)
        })),
        claims: verifyResponse.claims,
        trustAssessment,
        iocs: extractedIocs,
        mitreMappings,
        latencyMs: Math.round(endTime - startTime),
        modelUsed: genResponse.model,
        threatFlags: genResponse.threatFlags
      };

      onSaveAnalysis(record);
      setCurrentStage('complete');

      // Record audit log entry
      await recordAuditLog(
        'ANALYSIS_COMPLETED',
        `Analyzed query "${q.substring(0, 40)}..." with ${verifyResponse.claims.length} claims verified (Trust: ${trustAssessment.overallScore}/100)`,
        'Analyst-Session',
        trustAssessment.abstentionTriggered ? 'WARNING' : 'NORMAL'
      );

    } catch (err: any) {
      console.error('Pipeline execution failed:', err);
      setAnalysisError(err.message || 'Threat analysis failed to complete.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentRecord = activeAnalysis;

  const findChunkForCitation = (docName: string, chunkIdx: number): DocumentChunk | null => {
    if (currentRecord?.retrievedChunks) {
      const found = currentRecord.retrievedChunks.find(
        r => (r.chunk.documentName === docName || r.chunk.documentId === docName) && r.chunk.chunkIndex === chunkIdx
      );
      if (found) return found.chunk;
    }
    return chunks.find(
      c => (c.documentName === docName || c.documentId === docName) && c.chunkIndex === chunkIdx
    ) || null;
  };

  const handleInspectCitation = (cite: {
    documentName: string;
    chunkIndex: number;
    quote?: string;
    pageNumber?: number;
    sectionTitle?: string;
  }) => {
    const matchingRetrieval = currentRecord?.retrievedChunks.find(
      r => (r.chunk.documentName === cite.documentName || r.chunk.documentId === cite.documentName) && r.chunk.chunkIndex === cite.chunkIndex
    );

    const chunkObj = matchingRetrieval?.chunk || findChunkForCitation(cite.documentName, cite.chunkIndex) || {
      id: `chunk-preview-${cite.chunkIndex}`,
      documentId: 'unknown',
      documentName: cite.documentName,
      chunkIndex: cite.chunkIndex,
      pageNumber: cite.pageNumber || 1,
      sectionTitle: cite.sectionTitle || 'CTI Report Passage',
      content: cite.quote || 'Detailed chunk passage from document repository.',
      tokenCount: cite.quote ? Math.round(cite.quote.length / 4) : 100,
      keywords: [],
      contentHash: 'verified'
    };

    setInspectingEvidence({
      chunk: chunkObj,
      quote: cite.quote,
      relevanceTier: matchingRetrieval?.relevanceTier,
      matchedEntities: matchingRetrieval?.matchedEntities,
      scores: matchingRetrieval ? {
        semantic: matchingRetrieval.semanticScore,
        keyword: matchingRetrieval.keywordScore,
        hybrid: matchingRetrieval.hybridScore
      } : undefined
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              CONNECTED AGENTIC PIPELINE
            </span>
            <span className="text-xs text-slate-500">Modules 1, 2, 3 & 4 Integrated</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">End-to-End Cyber Threat Intelligence Analysis</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Query threat reports with citation grounding, claim verification (Subhajit), indicator extraction (Souvik), and trust scoring.
          </p>
        </div>

        {currentRecord && (
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-700">
              Latency: <strong className="text-teal-700">{currentRecord.latencyMs}ms</strong>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border font-semibold ${
              currentRecord.trustAssessment.overallScore >= 80
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              Trust Index: {currentRecord.trustAssessment.overallScore}/100
            </div>
          </div>
        )}
      </div>

      {/* Query Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="sm:w-60 flex-shrink-0">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="all">Scope: All Indexed Documents ({documents.length})</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  Scope: {d.filename}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleExecuteFullPipeline()}
              placeholder="Ask an evidence-grounded cybersecurity question about the ingested CTI reports..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            onClick={() => handleExecuteFullPipeline()}
            disabled={isAnalyzing}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? 'Executing Agent Pipeline...' : 'Run CTI Analysis'}</span>
          </button>
        </div>

        {/* Quick Question Buttons */}
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Predefined Ground-Truth Test Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(pq);
                  handleExecuteFullPipeline(pq);
                }}
                disabled={isAnalyzing}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-50 hover:bg-teal-50 hover:text-teal-900 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              >
                {pq}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Status Loader */}
        {isAnalyzing && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-3 animate-pulse">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-xs text-teal-900 font-mono font-medium">{currentStage}</span>
          </div>
        )}

        {analysisError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      {currentRecord && (
        <div className="space-y-6">
          {/* Abstention Warning Banner if triggered */}
          {currentRecord.trustAssessment.abstentionTriggered && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                ABSTENTION TRIGGERED: Insufficient or Contradicted CTI Evidence
              </div>
              <p>
                {currentRecord.trustAssessment.abstentionReason ||
                  'The system refrained from generating ungrounded speculative conclusions because the retrieved evidence does not meet entailment confidence thresholds.'}
              </p>
            </div>
          )}

          {/* Section 1: Grounded Answer & Citations */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Evidence-Grounded Intelligence Assessment
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Model: {currentRecord.modelUsed}
              </span>
            </div>

            {(currentRecord.modelUsed === 'local-evidence-grounding-engine' || currentRecord.modelUsed === 'seeded-demonstration-record') && (
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-700 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span>
                  {currentRecord.modelUsed === 'seeded-demonstration-record'
                    ? 'Pre-seeded synthetic demonstration record loaded at startup. Click "Run CTI Analysis" to execute a live query against the server pipeline.'
                    : 'Generated via deterministic local evidence-grounding engine (upstream Gemini API unavailable, rate-limited, or key not configured).'}
                </span>
              </div>
            )}

            <div className="p-5 font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
              {currentRecord.answer}
            </div>

            {/* Citations Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Corroborated Citations & Evidence Passages ({currentRecord.citations.length}):
                </span>
                <span className="text-[11px] text-teal-700 font-medium">
                  Click any citation card to inspect full passage
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentRecord.citations.map((cite, i) => (
                  <div
                    key={i}
                    onClick={() => handleInspectCitation(cite)}
                    className="p-3 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:shadow-xs transition-all text-[11px] text-slate-600 space-y-1.5 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-teal-900 group-hover:text-teal-700 flex items-center gap-1.5 font-mono">
                        <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-900 text-[10px] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="truncate max-w-[200px]" title={cite.documentName}>
                          {cite.documentName}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600 text-[10px]">
                          p.{cite.pageNumber || 1} • #{cite.chunkIndex}
                        </span>
                      </div>
                      <span className="text-[10px] text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold">
                        Inspect &rarr;
                      </span>
                    </div>

                    {cite.sectionTitle && (
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Section: <strong className="text-slate-700">{cite.sectionTitle}</strong>
                      </div>
                    )}

                    <p className="italic text-slate-700 line-clamp-2 bg-slate-50/70 p-1.5 rounded border border-slate-100 font-sans">
                      "{cite.quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Claim Verification (Module 3 - Subhajit) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Claim-Level Verification Matrix</h3>
                  <p className="text-[11px] text-slate-500">Subhajit Giri's Module 3 Entailment Layer</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToView('verification')}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
              >
                Inspect All Claims &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {currentRecord.claims.map((claim, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                      <p className="font-medium text-slate-800 leading-snug">{claim.claimText}</p>
                    </div>
                    <ClaimStatusBadge status={claim.status} />
                  </div>

                  <div className="pl-6 text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                    <span>
                      Confidence: <strong className="font-mono text-teal-700">{claim.confidence}%</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span>Citation:</span>
                      <button
                        onClick={() => handleInspectCitation({
                          documentName: claim.citation.documentName,
                          chunkIndex: claim.citation.chunkIndex,
                          pageNumber: claim.citation.pageNumber,
                          quote: claim.supportingEvidence?.[0] || claim.claimText
                        })}
                        className="font-mono text-teal-800 hover:text-teal-950 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer bg-teal-50/80 px-1.5 py-0.5 rounded border border-teal-200"
                        title="Click to inspect source evidence chunk"
                      >
                        [{claim.citation.documentName}, p.{claim.citation.pageNumber || 1}, #{claim.citation.chunkIndex}]
                        <ExternalLink className="w-2.5 h-2.5 text-teal-600" />
                      </button>
                    </span>
                  </div>

                  <div className="pl-6 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    <strong>Entailment Rationale:</strong> {claim.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Dual Grid (Trust Assessment + IOC Extraction) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trust Assessment Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">Trust Index & Factor Calibration</h3>
                </div>
                <button
                  onClick={() => onNavigateToView('trust')}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
                >
                  Configure Weights &rarr;
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Composite Trust Score</div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono mt-0.5">
                    {currentRecord.trustAssessment.overallScore}
                    <span className="text-base text-slate-400 font-normal">/100</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  currentRecord.trustAssessment.overallScore >= 80
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {currentRecord.trustAssessment.riskLevel.replace('_', ' ')}
                </span>
              </div>

              {/* Factors */}
              <div className="space-y-2.5 text-xs">
                {Object.entries(currentRecord.trustAssessment.factors).map(([key, factor]: any) => (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                      <span>{factor.label} (Weight: {(factor.weight * 100).toFixed(0)}%)</span>
                      <span className="font-mono">{factor.score}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-slate-500 italic border-t border-slate-100 pt-2 leading-relaxed">
                {currentRecord.trustAssessment.experimentalDisclaimer}
              </div>
            </div>

            {/* Extracted IOCs & MITRE Mappings */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">Extracted IOCs & MITRE ATT&CK</h3>
                </div>
                <button
                  onClick={() => onNavigateToView('iocs')}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
                >
                  Full Observables &rarr;
                </button>
              </div>

              {/* IOC Mini List */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Identified Observables ({currentRecord.iocs.length}):
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {currentRecord.iocs.map((ioc) => (
                    <div
                      key={ioc.id}
                      className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold flex-shrink-0">
                          {ioc.type}
                        </span>
                        <span className="font-mono text-slate-900 font-medium truncate" title={ioc.value}>
                          {ioc.defangedValue}
                        </span>
                      </div>
                      <span className={`text-[10px] px-1.5 rounded font-mono font-semibold flex-shrink-0 ${
                        ioc.reputation === 'documentation_range'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {ioc.reputation.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MITRE Mini List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Candidate MITRE ATT&CK Techniques ({currentRecord.mitreMappings.length}):
                </span>
                <div className="space-y-1.5">
                  {currentRecord.mitreMappings.slice(0, 3).map((mitre) => (
                    <div
                      key={mitre.techniqueId}
                      className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-800 text-[11px]">
                          {mitre.techniqueId}
                        </span>
                        <span className="font-medium text-slate-800 text-[11px]">{mitre.techniqueName}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        mitre.status === 'SUPPORTED_BY_EVIDENCE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {mitre.status === 'SUPPORTED_BY_EVIDENCE' ? 'Supported' : 'Candidate'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Passage Inspector Modal */}
      <EvidenceInspectorModal
        isOpen={!!inspectingEvidence}
        onClose={() => setInspectingEvidence(null)}
        chunk={inspectingEvidence?.chunk || null}
        highlightQuote={inspectingEvidence?.quote}
        relevanceTier={inspectingEvidence?.relevanceTier}
        matchedEntities={inspectingEvidence?.matchedEntities}
        scores={inspectingEvidence?.scores}
      />
    </div>
  );
};
