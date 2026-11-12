import React from 'react';
import {
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  Binary,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Layers,
  Activity,
  Cpu
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Badge, ClaimStatusBadge, TLPBadge } from '../common/Badge';
import { AnalysisQueryRecord, CTIDocument } from '../../types';
import { NavigationPage } from '../layout/Sidebar';
import { extractIOCsFromText } from '../../services/iocExtractor';

interface DashboardViewProps {
  documents: CTIDocument[];
  analysisHistory: AnalysisQueryRecord[];
  activeAnalysis: AnalysisQueryRecord | null;
  onNavigate: (page: NavigationPage) => void;
  onSelectAnalysis: (record: AnalysisQueryRecord) => void;
  onRunSampleQuery: (queryText: string) => void;
  onAnalyzeDoc?: (doc: CTIDocument) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  analysisHistory,
  activeAnalysis,
  onNavigate,
  onSelectAnalysis,
  onRunSampleQuery,
  onAnalyzeDoc
}) => {
  const processedDocs = documents.filter(d => d.ingestionStatus === 'indexed').length;
  const totalQueries = analysisHistory.length;
  
  // Aggregate claims
  let totalClaims = 0;
  let supportedClaims = 0;
  let unresolvedClaims = 0;
  let contradictedClaims = 0;
  let totalTrustScore = 0;
  let totalIOCs = 0;

  analysisHistory.forEach(record => {
    record.claims.forEach(c => {
      totalClaims++;
      if (c.status === 'SUPPORTED') supportedClaims++;
      else if (c.status === 'UNRESOLVED') unresolvedClaims++;
      else if (c.status === 'CONTRADICTED') contradictedClaims++;
    });
    totalTrustScore += record.trustAssessment.overallScore;
    totalIOCs += record.iocs.length;
  });

  const avgTrustScore = totalQueries > 0 ? Math.round(totalTrustScore / totalQueries) : 0;

  // IOC breakdown
  const iocTypeCounts: Record<string, number> = {
    ipv4: 0,
    domain: 0,
    url: 0,
    sha256: 0,
    md5: 0
  };

  if (totalQueries > 0) {
    analysisHistory.forEach(record => {
      record.iocs.forEach(ioc => {
        iocTypeCounts[ioc.type] = (iocTypeCounts[ioc.type] || 0) + 1;
      });
    });
  } else {
    // If no analysis queries run yet, compute true observable counts directly from all active indexed documents
    const combinedCorpusText = documents.map(d => d.rawText).join('\n');
    const corpusIOCs = extractIOCsFromText(combinedCorpusText, 'Corpus');
    corpusIOCs.forEach(ioc => {
      iocTypeCounts[ioc.type] = (iocTypeCounts[ioc.type] || 0) + 1;
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Banner / Academic Intro */}
      <div className="bg-gradient-to-r from-[#172B4D] to-[#243B53] text-white p-6 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-teal-500/20 text-teal-300 text-[11px] font-mono px-2 py-0.5 rounded border border-teal-500/30 font-semibold">
              ACADEMIC RESEARCH PLATFORM
            </span>
            <span className="text-slate-300 text-xs">CS IoT, Cyber & Blockchain Group</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            TrustRAG-Agent Intelligence Dashboard
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            An Evidence-Based, Trust-Aware Agentic Framework for Cyber Threat Intelligence (CTI). Integrating CTI repository curation (Swapnil), hybrid retrieval & RAG (Souvik Pal), claim-level verification & trust scoring (Subhajit Giri), and SOC evaluation (Keshav Dutta).
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('analysis')}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch New Threat Analysis</span>
            </button>
            <button
              onClick={() => onNavigate('team')}
              className="flex items-center gap-2 bg-[#243B53]/80 hover:bg-[#243B53] text-white border border-slate-600 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Explore Team Architecture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 8 Primary SOC Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total CTI Documents"
          value={documents.length}
          subValue={`${processedDocs} indexed into vector space`}
          icon={FolderArchive}
          badge={`${documents.filter(d => d.isSample).length} Samples`}
          badgeVariant="teal"
        />
        <MetricCard
          label="Corroborated Queries"
          value={totalQueries}
          subValue="Ground-truth RAG runs"
          icon={Cpu}
          badge="Active"
          badgeVariant="info"
        />
        <MetricCard
          label="Factual Claims Verified"
          value={totalClaims}
          subValue={`${supportedClaims} supported, ${unresolvedClaims} unresolved`}
          icon={CheckCircle2}
          badge={`${totalClaims > 0 ? Math.round((supportedClaims / totalClaims) * 100) : 0}% Entailment`}
          badgeVariant={totalClaims > 0 ? 'success' : 'neutral'}
        />
        <MetricCard
          label="Average Trust Score"
          value={totalQueries > 0 ? `${avgTrustScore}/100` : 'N/A'}
          subValue="Multi-factor weighted index"
          icon={ShieldCheck}
          badge={totalQueries === 0 ? 'Pending' : avgTrustScore >= 80 ? 'High Trust' : 'Moderate'}
          badgeVariant={totalQueries === 0 ? 'neutral' : avgTrustScore >= 80 ? 'success' : 'warning'}
        />
      </div>

      {/* Visualizations & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800">Claim Verification Ratio</h3>
            </div>
            <button
              onClick={() => onNavigate('verification')}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium"
            >
              Details &rarr;
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Supported Claims
                </span>
                <span className="font-mono">{supportedClaims} ({totalClaims > 0 ? Math.round((supportedClaims / totalClaims) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalClaims > 0 ? (supportedClaims / totalClaims) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Unresolved / Abstentions
                </span>
                <span className="font-mono">{unresolvedClaims} ({totalClaims > 0 ? Math.round((unresolvedClaims / totalClaims) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${totalClaims > 0 ? (unresolvedClaims / totalClaims) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Contradicted / False Positives
                </span>
                <span className="font-mono">{contradictedClaims} ({totalClaims > 0 ? Math.round((contradictedClaims / totalClaims) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${totalClaims > 0 ? (contradictedClaims / totalClaims) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong>Subhajit's Module 3 Rule:</strong> Unresolved claims prevent hallucination by strictly enforcing non-entailment abstention rather than allowing ungrounded speculation.
          </div>
        </div>

        {/* IOC Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Binary className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800">Extracted IOC Distribution</h3>
            </div>
            <button
              onClick={() => onNavigate('iocs')}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium"
            >
              Defang Table &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold font-mono text-slate-800">{iocTypeCounts.ipv4}</div>
              <div className="text-[11px] text-slate-500 uppercase font-medium mt-0.5">IPv4 Addresses</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold font-mono text-slate-800">{iocTypeCounts.domain}</div>
              <div className="text-[11px] text-slate-500 uppercase font-medium mt-0.5">Domains</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold font-mono text-slate-800">{iocTypeCounts.sha256}</div>
              <div className="text-[11px] text-slate-500 uppercase font-medium mt-0.5">SHA-256 Hashes</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold font-mono text-slate-800">{iocTypeCounts.url}</div>
              <div className="text-[11px] text-slate-500 uppercase font-medium mt-0.5">Defanged URLs</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>RFC 5737 Test-Net Tags</span>
            <span className="font-semibold text-emerald-700">Protected & Isolated</span>
          </div>
        </div>

        {/* Quick Benchmark Questions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800">Predefined CTI Inquiries</h3>
            </div>
            <button
              onClick={() => onNavigate('evaluation')}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium"
            >
              Benchmark &rarr;
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { q: 'What suspicious IP address is mentioned in the report?', tag: 'APT-SYN-042' },
              { q: 'What activity is described regarding workstation WS-FIN-089?', tag: 'Telemetry' },
              { q: 'Which statements are directly supported by the document?', tag: 'Verification' },
              { q: 'What candidate MITRE ATT&CK techniques may be relevant?', tag: 'MITRE' }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => onRunSampleQuery(item.q)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-all group flex items-start justify-between gap-2 cursor-pointer"
              >
                <span className="text-slate-700 group-hover:text-teal-900 font-medium leading-snug">
                  {item.q}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active CTI Ingested Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">Indexed CTI Documents Repository</h3>
          </div>
          <button
            onClick={() => onNavigate('repository')}
            className="text-xs text-teal-700 hover:text-teal-800 font-semibold"
          >
            Manage Repository &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Document Title</th>
                <th className="px-4 py-3">Source & Attribution</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">SHA-256 Checksum</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <div>
                      <div className="truncate max-w-xs">{doc.filename}</div>
                      {doc.isSample && (
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                          SYNTHETIC DEMO SAMPLE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{doc.source}</td>
                  <td className="px-4 py-3">
                    <TLPBadge tlp={doc.tlp} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                    {doc.contentHash ? `${doc.contentHash.substring(0, 12)}...` : 'calc...'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      INDEXED ({doc.chunkCount} chunks)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => (onAnalyzeDoc ? onAnalyzeDoc(doc) : onNavigate('retrieval'))}
                      className="text-teal-700 hover:text-teal-900 font-semibold text-xs cursor-pointer"
                    >
                      {onAnalyzeDoc ? 'Analyze \u2192' : 'Search \u2192'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
