import React, { useState } from 'react';
import {
  Target,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { AnalysisQueryRecord, MITREMapping } from '../../types';
import { MITRE_ATTACK_DB } from '../../services/mitreMapper';

interface MitreMappingViewProps {
  activeAnalysis: AnalysisQueryRecord | null;
}

export const MitreMappingView: React.FC<MitreMappingViewProps> = ({
  activeAnalysis
}) => {
  const [activeTab, setActiveTab] = useState<'detected' | 'reference'>('detected');
  const [filterTactic, setFilterTactic] = useState<string>('all');
  const mappings = activeAnalysis?.mitreMappings || [];

  const tactics = Array.from(new Set(MITRE_ATTACK_DB.map(m => m.tactic)));

  const filteredMappings = mappings.filter(m => {
    if (filterTactic === 'all') return true;
    return m.tactic === filterTactic;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Module Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              MODULE 2: SOUVIK PAL
            </span>
            <span className="text-xs text-slate-500">Adversary Tactics, Techniques & Procedures (TTPs)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">MITRE ATT&CK Matrix Mapping</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Correlates observed attacker behaviors strictly to authentic Enterprise ATT&CK techniques, requiring explicit analyst validation for candidate hypotheses.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('detected')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'detected' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Corroborated Techniques ({mappings.length})
          </button>
          <button
            onClick={() => setActiveTab('reference')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'reference' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Authentic MITRE Reference DB
          </button>
        </div>
      </div>

      {activeTab === 'detected' ? (
        <div className="space-y-4">
          {/* Tactic Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700">Filter by Tactic:</span>
              <select
                value={filterTactic}
                onChange={(e) => setFilterTactic(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1 bg-white text-xs text-slate-800 focus:outline-none"
              >
                <option value="all">All Enterprise Tactics</option>
                {tactics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">
              {filteredMappings.length} technique mappings
            </span>
          </div>

          {filteredMappings.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              No MITRE ATT&CK techniques correlated yet. Execute a query in the AI Threat Analysis module.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMappings.map((item) => (
                <div
                  key={item.techniqueId}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-teal-800 text-sm">
                          {item.techniqueId}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {item.techniqueName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                        Tactic: <strong>{item.tactic}</strong>
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                      item.status === 'SUPPORTED_BY_EVIDENCE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {item.status === 'SUPPORTED_BY_EVIDENCE'
                        ? 'SUPPORTED BY EVIDENCE'
                        : 'CANDIDATE (NEEDS VALIDATION)'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed font-sans">
                    <strong className="text-slate-900 block text-[11px] mb-1 font-mono">
                      Corroborating Telemetry Context:
                    </strong>
                    {item.candidateEvidence}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      Confidence: <strong className="font-mono text-teal-700 uppercase">{item.confidence}</strong>
                    </span>
                    <a
                      href={`https://attack.mitre.org/techniques/${item.techniqueId.replace('.', '/')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:text-teal-900 flex items-center gap-1 font-medium"
                    >
                      <span>MITRE Matrix</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Reference Matrix */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Authentic Verified MITRE ATT&CK Enterprise Matrix Techniques ({MITRE_ATTACK_DB.length})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">MITRE Enterprise v14</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {MITRE_ATTACK_DB.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-800">{t.id}</span>
                    <span className="font-semibold text-slate-800">{t.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Tactic: {t.tactic}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 max-w-sm justify-end">
                  {t.keywords.slice(0, 3).map((kw, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
