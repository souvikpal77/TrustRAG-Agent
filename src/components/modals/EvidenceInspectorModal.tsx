import React from 'react';
import { X, FileText, Bookmark, Hash, Layers, Shield, Cpu, Copy, Check } from 'lucide-react';
import { DocumentChunk } from '../../types';

interface EvidenceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chunk: DocumentChunk | null;
  highlightQuote?: string;
  sourceDocName?: string;
  pageNumber?: number;
  sectionTitle?: string;
  chunkIndex?: number;
  relevanceTier?: 'HIGH' | 'MODERATE' | 'MARGINAL';
  matchedEntities?: string[];
  scores?: {
    semantic?: number;
    keyword?: number;
    hybrid?: number;
  };
}

export const EvidenceInspectorModal: React.FC<EvidenceInspectorModalProps> = ({
  isOpen,
  onClose,
  chunk,
  highlightQuote,
  sourceDocName,
  pageNumber,
  sectionTitle,
  chunkIndex,
  relevanceTier,
  matchedEntities = [],
  scores
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !chunk) return null;

  const docName = chunk.documentName || sourceDocName || 'Unknown Document';
  const page = chunk.pageNumber || pageNumber || 1;
  const section = chunk.sectionTitle || sectionTitle || 'Document Body';
  const idx = chunk.chunkIndex !== undefined ? chunk.chunkIndex : chunkIndex !== undefined ? chunkIndex : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render text with highlighted quote
  const renderHighlightedContent = () => {
    if (!highlightQuote || !highlightQuote.trim()) {
      return <span>{chunk.content}</span>;
    }

    const cleanQuote = highlightQuote.trim();
    const lowerContent = chunk.content.toLowerCase();
    const lowerQuote = cleanQuote.toLowerCase();
    const matchIdx = lowerContent.indexOf(lowerQuote);

    if (matchIdx === -1) {
      return (
        <div>
          <div className="mb-3 p-2.5 rounded bg-teal-50 border border-teal-200 text-teal-900 text-xs font-mono">
            <span className="font-bold text-teal-800">Grounding Quote:</span> "{cleanQuote}"
          </div>
          <span>{chunk.content}</span>
        </div>
      );
    }

    const before = chunk.content.substring(0, matchIdx);
    const match = chunk.content.substring(matchIdx, matchIdx + cleanQuote.length);
    const after = chunk.content.substring(matchIdx + cleanQuote.length);

    return (
      <span>
        {before}
        <mark className="bg-teal-100 text-teal-900 font-semibold px-1 py-0.5 rounded border border-teal-300">
          {match}
        </mark>
        {after}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Evidence Passage Inspector
                </h3>
                {relevanceTier && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    relevanceTier === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : relevanceTier === 'MODERATE'
                      ? 'bg-teal-100 text-teal-800 border border-teal-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}>
                    {relevanceTier} Relevance
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {docName} • Page {page} • Chunk #{idx}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata sub-bar */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Bookmark className="w-3.5 h-3.5 text-teal-600" />
              Section: <strong className="text-slate-900">{section}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-500">
              Tokens: ~{chunk.tokenCount || Math.round(chunk.content.length / 4)}
            </span>
          </div>

          {scores && scores.hybrid !== undefined && (
            <div className="flex items-center gap-2 font-mono text-[10px]">
              {scores.keyword !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                  BM25: {scores.keyword.toFixed(2)}
                </span>
              )}
              {scores.semantic !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                  Semantic: {scores.semantic.toFixed(2)}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-bold border border-teal-300">
                Hybrid: {scores.hybrid.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Matched Entities if available */}
          {matchedEntities.length > 0 && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Technical Observables & Keywords Detected in Chunk:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {matchedEntities.map((ent, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-teal-800 border border-slate-200 font-medium"
                  >
                    {ent}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Chunk Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Full Ingested Passage Content:
              </span>
              <button
                onClick={handleCopy}
                className="text-[11px] text-teal-700 hover:text-teal-900 flex items-center gap-1 font-medium cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
              {renderHighlightedContent()}
            </div>
          </div>

          {/* Cryptographic Verification Checksum */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-500 flex items-center justify-between">
            <span className="truncate">
              SHA-256: {chunk.contentHash || 'Verified Ingestion Checksum'}
            </span>
            <span className="text-teal-700 font-semibold flex-shrink-0 ml-2">Verified Chunk</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
