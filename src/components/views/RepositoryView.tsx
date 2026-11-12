import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Shield,
  FileCode,
  RotateCcw,
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react';
import { CTIDocument, DocumentType, TLPClassification } from '../../types';
import { Badge, TLPBadge } from '../common/Badge';
import { computeSHA256 } from '../../services/textProcessing';
import { parsePdfDocument } from '../../services/api';

interface RepositoryViewProps {
  documents: CTIDocument[];
  onAddDocument: (doc: CTIDocument) => void;
  onDeleteDocument: (id: string) => void;
  onResetSamples: () => void;
  onAnalyzeDoc?: (doc: CTIDocument) => void;
  defaultOpenUpload?: boolean;
  onConsumeOpenUpload?: () => void;
}

export const RepositoryView: React.FC<RepositoryViewProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
  onResetSamples,
  onAnalyzeDoc,
  defaultOpenUpload = false,
  onConsumeOpenUpload
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTLP, setSelectedTLP] = useState<string>('all');
  const [inspectingDoc, setInspectingDoc] = useState<CTIDocument | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(defaultOpenUpload);

  useEffect(() => {
    if (defaultOpenUpload) {
      setIsUploadOpen(true);
      if (onConsumeOpenUpload) onConsumeOpenUpload();
    }
  }, [defaultOpenUpload, onConsumeOpenUpload]);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadSource, setUploadSource] = useState('Enterprise CSIRT / Threat Desk');
  const [uploadAuthor, setUploadAuthor] = useState('Cybersecurity Analyst');
  const [uploadDate, setUploadDate] = useState('2026-03-25');
  const [uploadType, setUploadType] = useState<DocumentType>('incident_report');
  const [uploadTLP, setUploadTLP] = useState<TLPClassification>('WHITE');
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState<string | null>(null);

  // File drop / select handler with real PDF parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFilename(file.name);
    setUploadError(null);
    setUploadSuccessInfo(null);
    const reader = new FileReader();

    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      setIsUploading(true);
      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string) || '';
          const result = await parsePdfDocument(base64, file.name);
          setUploadContent(result.extractedText);
          setUploadSuccessInfo(`Successfully extracted text from ${result.pageCount} page(s) of "${file.name}".`);
          setIsUploading(false);
        } catch (err: any) {
          console.warn('PDF parsing error:', err);
          setUploadError(`PDF text extraction notice: ${err?.message || 'Unable to parse'}. You can paste plain text telemetry directly below.`);
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setUploadContent(text);
        setUploadSuccessInfo(`Loaded plain text from "${file.name}" (${text.length} characters).`);
      };
      reader.readAsText(file);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!uploadFilename.trim() || !uploadContent.trim()) {
      setUploadError('Document filename and text content are required.');
      return;
    }

    try {
      setIsUploading(true);
      const contentHash = await computeSHA256(uploadContent);
      
      const newDoc: CTIDocument = {
        id: `doc-${Date.now()}`,
        filename: uploadFilename.trim(),
        source: uploadSource.trim(),
        publicationDate: uploadDate,
        documentType: uploadType,
        ingestionStatus: 'indexed',
        contentHash,
        rawText: uploadContent,
        isSample: false, // Explicit actual uploaded document
        fileSize: new Blob([uploadContent]).size,
        uploadedAt: new Date().toISOString(),
        author: uploadAuthor.trim(),
        tlp: uploadTLP,
        chunkCount: Math.max(1, Math.ceil(uploadContent.split(/\s+/).length / 140)),
        summary: uploadContent.substring(0, 180).replace(/\n/g, ' ') + '...'
      };

      onAddDocument(newDoc);
      setIsUploadOpen(false);
      setUploadFilename('');
      setUploadContent('');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process document');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || doc.documentType === selectedType;
    const matchesTLP = selectedTLP === 'all' || doc.tlp === selectedTLP;
    return matchesSearch && matchesType && matchesTLP;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Module 1 Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              MODULE 1: SWAPNIL
            </span>
            <span className="text-xs text-slate-500">CTI Dataset Collection & Ingestion Layer</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">CTI Document Repository & Provenance</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Manages raw threat advisories, cryptographic checksums (SHA-256), Traffic Light Protocol (TLP) classifications, and source attribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetSamples}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            title="Reload initial synthetic demonstration CTI reports"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Samples</span>
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New CTI Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Search by filename, source, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="incident_report">Incident Report</option>
              <option value="malware_analysis">Malware Analysis</option>
              <option value="security_advisory">Security Advisory</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>TLP:</span>
            <select
              value={selectedTLP}
              onChange={(e) => setSelectedTLP(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
            >
              <option value="all">All TLP</option>
              <option value="WHITE">TLP:WHITE</option>
              <option value="GREEN">TLP:GREEN</option>
              <option value="AMBER">TLP:AMBER</option>
              <option value="RED">TLP:RED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Repository Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Document & Provenance</th>
                <th className="px-4 py-3">Data Classification</th>
                <th className="px-4 py-3">Source Attribution</th>
                <th className="px-4 py-3">Publication Date</th>
                <th className="px-4 py-3">Cryptographic Hash</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No CTI documents match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">{doc.filename}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Author: {doc.author}</span>
                            <span>•</span>
                            <span>{((doc.fileSize || 0) / 1024).toFixed(1)} KB</span>
                          </div>
                          {doc.isSample ? (
                            <span className="inline-block mt-1 font-mono text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-semibold">
                              [SYNTHETIC DEMO DATA]
                            </span>
                          ) : (
                            <span className="inline-block mt-1 font-mono text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 rounded font-semibold">
                              [USER UPLOADED CTI]
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TLPBadge tlp={doc.tlp} />
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{doc.source}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{doc.publicationDate}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      <span title={doc.contentHash} className="cursor-help">
                        {doc.contentHash ? doc.contentHash.substring(0, 14) + '...' : 'none'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        INDEXED ({doc.chunkCount} chunks)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onAnalyzeDoc && (
                          <button
                            onClick={() => onAnalyzeDoc(doc)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded transition-colors"
                            title="Run AI threat analysis on this document"
                          >
                            <Sparkles className="w-3 h-3 text-teal-600" />
                            <span>Analyze</span>
                          </button>
                        )}
                        <button
                          onClick={() => setInspectingDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                          title="Inspect raw CTI content"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!doc.isSample && (
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Inspector Modal */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  {inspectingDoc.filename}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  SHA-256: {inspectingDoc.contentHash}
                </p>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-lg px-2"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-50 text-slate-800 whitespace-pre-wrap leading-relaxed select-text border-b border-slate-200">
              {inspectingDoc.rawText}
            </div>

            <div className="p-4 bg-white flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span>Classification: <TLPBadge tlp={inspectingDoc.tlp} /></span>
                <span>Source: <strong>{inspectingDoc.source}</strong></span>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-teal-600" />
                  Upload & Ingest Cyber Threat Intelligence Report
                </h3>
                <p className="text-xs text-slate-500">Supports PDF (server-side parsed), TXT, Markdown, and JSON CTI formats.</p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccessInfo && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{uploadSuccessInfo}</span>
              </div>
            )}

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select File from Computer</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.md,.json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Title / Filename</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CISA_AA26-081A_Advisory.txt"
                    value={uploadFilename}
                    onChange={(e) => setUploadFilename(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source / Attribution</label>
                  <input
                    type="text"
                    required
                    value={uploadSource}
                    onChange={(e) => setUploadSource(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author / Reporting Desk</label>
                  <input
                    type="text"
                    required
                    value={uploadAuthor}
                    onChange={(e) => setUploadAuthor(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TLP Classification</label>
                  <select
                    value={uploadTLP}
                    onChange={(e) => setUploadTLP(e.target.value as TLPClassification)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="WHITE">TLP:WHITE (Public)</option>
                    <option value="GREEN">TLP:GREEN (Community)</option>
                    <option value="AMBER">TLP:AMBER (Restricted)</option>
                    <option value="RED">TLP:RED (Confidential)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as DocumentType)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="incident_report">Incident Report</option>
                    <option value="malware_analysis">Malware Analysis</option>
                    <option value="security_advisory">Security Advisory</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Publication Date</label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Raw Text Content (or Paste CTI Stream)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste raw cyber threat intelligence text containing observables, IoCs, and behavioral narratives..."
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  className="w-full font-mono border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-1.5 rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isUploading ? 'Computing Checksum...' : 'Ingest & Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
