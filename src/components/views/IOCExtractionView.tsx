import React, { useState } from 'react';
import {
  Binary,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  ShieldAlert,
  Globe,
  Hash,
  Link2,
  Server
} from 'lucide-react';
import { AnalysisQueryRecord, ExtractedIOC, IOCType } from '../../types';

interface IOCExtractionViewProps {
  activeAnalysis: AnalysisQueryRecord | null;
  allHistoricalIOCs?: ExtractedIOC[];
}

export const IOCExtractionView: React.FC<IOCExtractionViewProps> = ({
  activeAnalysis,
  allHistoricalIOCs = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rawList = (activeAnalysis?.iocs && activeAnalysis.iocs.length > 0)
    ? activeAnalysis.iocs
    : allHistoricalIOCs;

  const filteredIOCs = rawList.filter(ioc => {
    const matchesSearch = ioc.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ioc.context.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || ioc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredIOCs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'trustrag_iocs_export.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getTypeIcon = (type: IOCType) => {
    switch (type) {
      case 'ipv4': return Server;
      case 'domain': return Globe;
      case 'url': return Link2;
      default: return Hash;
    }
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
            <span className="text-xs text-slate-500">Observable Ingestion & Defanging</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Indicators of Compromise (IOC) Repository</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Automatically isolates IPv4 endpoints, domains, URLs, and cryptographic hashes with safety defanging to prevent accidental trigger execution in SOC environments.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export IOC Feed (JSON)</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search indicator value or surrounding sentence context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs text-slate-800 focus:outline-none"
          >
            <option value="all">All Indicator Types</option>
            <option value="ipv4">IPv4 Addresses</option>
            <option value="domain">Domains</option>
            <option value="url">URLs</option>
            <option value="sha256">SHA-256 Hashes</option>
            <option value="md5">MD5 Hashes</option>
          </select>
        </div>
      </div>

      {/* Structured IOC Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Defanged Indicator</th>
                <th className="px-4 py-3">Raw Value</th>
                <th className="px-4 py-3">Contextual Snippet</th>
                <th className="px-4 py-3">Reputation / Range</th>
                <th className="px-4 py-3">Document Source</th>
                <th className="px-4 py-3 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredIOCs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No indicators match your filter criteria or no analysis run.
                  </td>
                </tr>
              ) : (
                filteredIOCs.map((ioc) => {
                  const Icon = getTypeIcon(ioc.type);
                  return (
                    <tr key={ioc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          <Icon className="w-3 h-3 text-teal-600" />
                          {ioc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-900 font-bold">
                        {ioc.defangedValue}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px] truncate max-w-[140px]" title={ioc.value}>
                        {ioc.value}
                      </td>
                      <td className="px-4 py-3 text-slate-600 italic text-[11px] max-w-xs truncate" title={ioc.context}>
                        {ioc.context}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          ioc.reputation === 'documentation_range'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : ioc.threatSeverity === 'critical'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {ioc.reputation.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {ioc.firstSeenInDoc}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleCopy(ioc.defangedValue, ioc.id)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                          title="Copy defanged value"
                        >
                          {copiedId === ioc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
