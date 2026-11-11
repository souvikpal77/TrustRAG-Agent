import React, { useState } from 'react';
import {
  FileInput,
  Scissors,
  CheckCircle2,
  FileText,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  Hash,
  Database
} from 'lucide-react';
import { CTIDocument, DocumentChunk } from '../../types';
import { chunkDocument } from '../../services/textProcessing';
import { Badge } from '../common/Badge';

interface IngestionViewProps {
  documents: CTIDocument[];
  chunks: DocumentChunk[];
  onUpdateChunks: (newChunks: DocumentChunk[]) => void;
  onNavigateToRetrieval: () => void;
}

export const IngestionView: React.FC<IngestionViewProps> = ({
  documents,
  chunks,
  onUpdateChunks,
  onNavigateToRetrieval
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [targetChunkSize, setTargetChunkSize] = useState<number>(140);
  const [overlapTokens, setOverlapTokens] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];
  const docChunks = chunks.filter(c => c.documentId === selectedDoc?.id);

  const handleRechunkAll = () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    setTimeout(() => {
      const regeneratedChunks: DocumentChunk[] = [];
      documents.forEach(doc => {
        const c = chunkDocument(doc.id, doc.filename, doc.rawText, targetChunkSize, overlapTokens);
        regeneratedChunks.push(...c);
      });

      onUpdateChunks(regeneratedChunks);
      setIsProcessing(false);
      setSuccessMessage(`Successfully re-indexed ${documents.length} CTI documents into ${regeneratedChunks.length} semantic chunks.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 400);
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
            <span className="text-xs text-slate-500">Document Ingestion, Normalization & Chunking</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Semantic Preprocessing & Sliding-Window Chunker</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Normalizes unstructured CTI prose, strips malicious hidden unicode injections, and builds cohesive sliding-window chunks with preserved document and page citations.
          </p>
        </div>

        <button
          onClick={onNavigateToRetrieval}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <span>Proceed to Hybrid Retrieval</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Chunker Parameter Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">Chunking Engine Parameters</h3>
          </div>
          <button
            onClick={handleRechunkAll}
            disabled={isProcessing}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Re-indexing...' : 'Execute Re-Chunking Pipeline'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Document to Inspect
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white text-slate-800 focus:outline-none"
            >
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.isSample ? 'Demo' : 'User'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Target Chunk Size</span>
              <span className="font-mono text-teal-700">{targetChunkSize} tokens</span>
            </div>
            <input
              type="range"
              min={80}
              max={300}
              step={10}
              value={targetChunkSize}
              onChange={(e) => setTargetChunkSize(parseInt(e.target.value, 10))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Optimal for dense threat indicator paragraphs.</p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Sliding Window Overlap</span>
              <span className="font-mono text-teal-700">{overlapTokens} tokens</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={overlapTokens}
              onChange={(e) => setOverlapTokens(parseInt(e.target.value, 10))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Preserves cross-boundary technical context.</p>
          </div>
        </div>
      </div>

      {/* Chunk Breakdown List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Generated Semantic Chunks for <span className="text-teal-700">{selectedDoc?.filename}</span>
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {docChunks.length} chunks generated
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {docChunks.map((chunk) => (
            <div
              key={chunk.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-800">Chunk #{chunk.chunkIndex}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">Page {chunk.pageNumber}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-teal-700">{chunk.tokenCount} words</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  REF: [{chunk.documentName}, Chunk #{chunk.chunkIndex}]
                </div>
              </div>

              <div className="text-xs text-slate-700 font-sans leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                {chunk.content}
              </div>

              {/* Salient Technical Keywords */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">Indexed Tokens:</span>
                {chunk.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
