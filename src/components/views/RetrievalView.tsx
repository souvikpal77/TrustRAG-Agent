import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  Crosshair,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { DocumentChunk, RetrievalResult } from '../../types';
import { performHybridRetrieval } from '../../services/hybridRetrieval';
import { PRESET_QUERIES } from '../../data/sampleData';
import { EvidenceInspectorModal } from '../modals/EvidenceInspectorModal';

interface RetrievalViewProps {
  chunks: DocumentChunk[];
  onLaunchAnalysis: (query: string, evidence: RetrievalResult[], docId?: string) => void;
  availableDocNames?: { id: string; name: string }[];
}

export const RetrievalView: React.FC<RetrievalViewProps> = ({
  chunks,
  onLaunchAnalysis,
  availableDocNames = []
}) => {
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [semanticWeight, setSemanticWeight] = useState(0.50);
  const [keywordWeight, setKeywordWeight] = useState(0.50);
  const [topK, setTopK] = useState(5);
  const [inspectingResult, setInspectingResult] = useState<RetrievalResult | null>(null);
  const [results, setResults] = useState<RetrievalResult[]>(() => 
    performHybridRetrieval(PRESET_QUERIES[0], chunks, { topK: 5, semanticWeight: 0.5, keywordWeight: 0.5 })
  );

  const handleExecuteSearch = (searchQuery: string = query, docId: string = selectedDocId) => {
    if (!searchQuery.trim()) return;
    const filterDocIds = docId !== 'all' ? [docId] : undefined;
    const res = performHybridRetrieval(searchQuery, chunks, {
      topK,
      semanticWeight,
      keywordWeight,
      selectedDocIds: filterDocIds
    });
    setResults(res);
  };

  const handleWeightChange = (newSemWeight: number) => {
    setSemanticWeight(newSemWeight);
    setKeywordWeight(Math.round((1 - newSemWeight) * 100) / 100);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Module Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              MODULE 2: SOUVIK PAL
            </span>
            <span className="text-xs text-slate-500">Hybrid Retrieval Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Dual-Vector Semantic + BM25 Keyword Search</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Transparently fuses continuous character n-gram semantic similarity with BM25 technical keyword token frequency to pinpoint exact IPs, CVEs, and contextual threat behavior.
          </p>
        </div>

        {results.length > 0 && (
          <button
            onClick={() => onLaunchAnalysis(query, results, selectedDocId)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            <span>Generate Grounded RAG Answer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Query Bar & Presets */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          {availableDocNames.length > 0 && (
            <div className="sm:w-56 flex-shrink-0">
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  handleExecuteSearch(query, e.target.value);
                }}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Documents ({availableDocNames.length})</option>
                {availableDocNames.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
              placeholder="Enter cybersecurity threat intelligence query (e.g., suspicious IPs, persistence, malware)..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            onClick={() => handleExecuteSearch()}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Retrieve Evidence</span>
          </button>
        </div>

        {/* Preset Queries */}
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Sample Ground-Truth Inquiries:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(preset);
                  handleExecuteSearch(preset);
                }}
                className={`text-xs px-2.5 py-1 rounded-md border text-left transition-all cursor-pointer ${
                  query === preset
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Weights Configuration Drawer */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            <SlidersHorizontal className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span>Semantic Weight: <strong className="font-mono text-teal-700">{(semanticWeight * 100).toFixed(0)}%</strong></span>
                <span>Keyword (BM25) Weight: <strong className="font-mono text-teal-700">{(keywordWeight * 100).toFixed(0)}%</strong></span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={semanticWeight}
                onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>Passages Top-K:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-xs font-mono"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={8}>Top 8</option>
            </select>
          </div>
        </div>
      </div>

      {/* Retrieved Evidence Ranked List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Ranked Evidence Passages ({results.length} retrieved)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Ordered by descending hybrid relevance score
          </span>
        </div>

        {results.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No relevant evidence passages found for this query. Try adjusting query terms or switching weights.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {results.map((res, index) => (
              <div
                key={res.chunk.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-all space-y-3"
              >
                {/* Header with detailed scoring */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-900 font-mono font-bold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {res.chunk.documentName}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      p.{res.chunk.pageNumber} • #{res.chunk.chunkIndex}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      res.relevanceTier === 'HIGH'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : res.relevanceTier === 'MODERATE'
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}>
                      {res.relevanceTier} Relevance
                    </span>
                    {res.chunk.sectionTitle && (
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {res.chunk.sectionTitle}
                      </span>
                    )}
                  </div>

                  {/* Score breakdown pills */}
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      BM25: {(res.keywordScore).toFixed(2)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Semantic: {(res.semanticScore).toFixed(2)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-bold border border-teal-200">
                      Hybrid: {(res.hybridScore).toFixed(2)}
                    </span>
                    <button
                      onClick={() => setInspectingResult(res)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer ml-1"
                      title="Inspect full chunk in passage viewer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                  {res.chunk.content}
                </div>

                {/* Matched technical entities if detected */}
                {res.matchedEntities && res.matchedEntities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Matched Technical Entities:
                    </span>
                    {res.matchedEntities.map((ent, i) => (
                      <span
                        key={i}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-teal-800 border border-slate-200 font-semibold"
                      >
                        {ent}
                      </span>
                    ))}
                  </div>
                )}

                {/* Match Snippet Highlight */}
                {res.matchHighlights.length > 0 && (
                  <div className="text-[11px] text-teal-900 bg-teal-50/60 p-2 rounded border border-teal-100 flex items-start gap-1.5 font-mono">
                    <span className="font-bold text-teal-700 flex-shrink-0">Corroborated Match:</span>
                    <span>"{res.matchHighlights[0]}"</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Inspector Modal */}
      <EvidenceInspectorModal
        isOpen={!!inspectingResult}
        onClose={() => setInspectingResult(null)}
        chunk={inspectingResult?.chunk || null}
        highlightQuote={inspectingResult?.matchHighlights?.[0]}
        relevanceTier={inspectingResult?.relevanceTier}
        matchedEntities={inspectingResult?.matchedEntities}
        scores={inspectingResult ? {
          semantic: inspectingResult.semanticScore,
          keyword: inspectingResult.keywordScore,
          hybrid: inspectingResult.hybridScore
        } : undefined}
      />
    </div>
  );
};
