import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Filter,
  FileText,
  ShieldCheck,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Info,
  ExternalLink
} from 'lucide-react';
import { AnalysisQueryRecord, ClaimStatus, ClaimVerification, DocumentChunk } from '../../types';
import { ClaimStatusBadge } from '../common/Badge';
import { EvidenceInspectorModal } from '../modals/EvidenceInspectorModal';

interface ClaimVerificationViewProps {
  activeAnalysis: AnalysisQueryRecord | null;
  onUpdateClaimStatus: (claimId: string, newStatus: ClaimStatus) => void;
  chunks?: DocumentChunk[];
}

export const ClaimVerificationView: React.FC<ClaimVerificationViewProps> = ({
  activeAnalysis,
  onUpdateClaimStatus,
  chunks = []
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [inspectingEvidence, setInspectingEvidence] = useState<{
    chunk: DocumentChunk;
    quote?: string;
    relevanceTier?: 'HIGH' | 'MODERATE' | 'MARGINAL';
    matchedEntities?: string[];
    scores?: { semantic?: number; keyword?: number; hybrid?: number };
  } | null>(null);

  const claims = activeAnalysis?.claims || [];

  const filteredClaims = claims.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const supportedCount = claims.filter(c => c.status === 'SUPPORTED').length;
  const unresolvedCount = claims.filter(c => c.status === 'UNRESOLVED').length;
  const contradictedCount = claims.filter(c => c.status === 'CONTRADICTED').length;

  const handleInspectClaimEvidence = (claim: ClaimVerification) => {
    const matchingRetrieval = activeAnalysis?.retrievedChunks.find(
      r => (r.chunk.documentName === claim.citation.documentName || r.chunk.documentId === claim.citation.documentName) &&
           r.chunk.chunkIndex === claim.citation.chunkIndex
    );

    const chunkObj = matchingRetrieval?.chunk || chunks.find(
      c => (c.documentName === claim.citation.documentName || c.documentId === claim.citation.documentName) &&
           c.chunkIndex === claim.citation.chunkIndex
    ) || {
      id: `chunk-claim-${claim.citation.chunkIndex}`,
      documentId: 'unknown',
      documentName: claim.citation.documentName,
      chunkIndex: claim.citation.chunkIndex,
      pageNumber: claim.citation.pageNumber || 1,
      sectionTitle: 'CTI Verification Evidence',
      content: claim.supportingEvidence?.[0] || claim.rationale || 'Grounding evidence chunk passage.',
      tokenCount: 100,
      keywords: [],
      contentHash: 'verified'
    };

    setInspectingEvidence({
      chunk: chunkObj,
      quote: claim.supportingEvidence?.[0] || claim.claimText,
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
      {/* Module Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              MODULE 3: SUBHAJIT GIRI
            </span>
            <span className="text-xs text-slate-500">Claim-Level Verification & Factual Grounding</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Fine-Grained Claim Verification & Entailment</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Decomposes synthesized intelligence reports into isolated atomic propositions, verifying each against cited passages with strict SUPPORTED, CONTRADICTED, or UNRESOLVED labels.
          </p>
        </div>

        {/* Status Count Pills */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            {supportedCount} Supported
          </span>
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            {unresolvedCount} Unresolved
          </span>
          <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
            {contradictedCount} Contradicted
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Claims:</span>
          <div className="flex gap-1.5">
            {['all', 'SUPPORTED', 'UNRESOLVED', 'CONTRADICTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All Claims' : st}
              </button>
            ))}
          </div>
        </div>

        <span className="text-slate-500 text-[11px]">
          Showing {filteredClaims.length} of {claims.length} claims
        </span>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
          No claims match this status or no analysis has been executed yet. Run a query in AI Threat Analysis.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim, index) => (
            <div
              key={claim.id || index}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                    #{index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-xs leading-relaxed">
                      {claim.claimText}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <span>Source:</span>
                        <button
                          onClick={() => handleInspectClaimEvidence(claim)}
                          className="font-bold text-teal-800 hover:text-teal-950 hover:underline inline-flex items-center gap-1 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 cursor-pointer"
                          title="Click to inspect source evidence passage"
                        >
                          <span>{claim.citation.documentName}</span>
                          <span className="text-slate-400">|</span>
                          <span>p.{claim.citation.pageNumber || 1} • #{claim.citation.chunkIndex}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-teal-600" />
                        </button>
                      </span>
                      <span>•</span>
                      <span>Calibrated Model Confidence: <strong className="text-teal-700">{claim.confidence}%</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ClaimStatusBadge status={claim.status} />
                  
                  {/* Analyst Manual Validation Override */}
                  <div className="flex items-center border border-slate-200 rounded p-0.5 bg-slate-50">
                    <button
                      onClick={() => onUpdateClaimStatus(claim.id, 'SUPPORTED')}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        claim.status === 'SUPPORTED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-700'
                      }`}
                      title="Validate as SUPPORTED"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateClaimStatus(claim.id, 'UNRESOLVED')}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        claim.status === 'UNRESOLVED' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-700'
                      }`}
                      title="Mark as UNRESOLVED (Abstain)"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateClaimStatus(claim.id, 'CONTRADICTED')}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        claim.status === 'CONTRADICTED' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-700'
                      }`}
                      title="Mark as CONTRADICTED"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rationale and Evidence Passages */}
              <div className="pl-8 space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block mb-0.5">Verification Rationale:</strong>
                  {claim.rationale}
                </div>

                {claim.supportingEvidence && claim.supportingEvidence.length > 0 && (
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-emerald-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-emerald-800 text-[11px]">Grounding Evidence Excerpt:</strong>
                      <button
                        onClick={() => handleInspectClaimEvidence(claim)}
                        className="text-[10px] text-teal-800 hover:text-teal-950 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        Inspect Full Chunk Passage &rarr;
                      </button>
                    </div>
                    <span className="italic block">"{claim.supportingEvidence[0]}"</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Inspector Modal */}
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
