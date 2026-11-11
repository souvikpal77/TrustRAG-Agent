import React from 'react';
import {
  Users2,
  FolderArchive,
  Cpu,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Layers,
  GraduationCap
} from 'lucide-react';
import { TEAM_MEMBERS } from '../../data/sampleData';
import { NavigationPage } from '../layout/Sidebar';

interface TeamContributionsViewProps {
  onNavigate: (page: NavigationPage) => void;
}

export const TeamContributionsView: React.FC<TeamContributionsViewProps> = ({
  onNavigate
}) => {
  const getMemberIcon = (stage: number) => {
    switch (stage) {
      case 1: return FolderArchive;
      case 2: return Cpu;
      case 3: return ShieldCheck;
      default: return BarChart3;
    }
  };

  const getTargetView = (stage: number): NavigationPage => {
    switch (stage) {
      case 1: return 'repository';
      case 2: return 'retrieval';
      case 3: return 'verification';
      default: return 'dashboard';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              ACADEMIC RESEARCH & ENGINEERING TEAM
            </span>
            <span className="text-xs text-slate-500">CS IoT, Cyber & Blockchain Engineering</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">TrustRAG-Agent Collaborative Pipeline</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Architecture and technical division of responsibilities across the 4-member research team, demonstrating end-to-end data flow from raw CTI collection to verified threat analysis.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs text-slate-700">
          <GraduationCap className="w-4 h-4 text-teal-600" />
          <span>Computer Science Academic Capstone</span>
        </div>
      </div>

      {/* Interactive 4-Stage Connected Workflow Diagram */}
      <div className="bg-gradient-to-r from-slate-900 via-[#172B4D] to-slate-900 text-white p-6 rounded-xl border border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              End-to-End Inter-Module Dataflow
            </h3>
          </div>
          <span className="text-[11px] text-teal-400 font-mono">Sequential Connected Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {[
            { step: '01', name: 'Swapnil', title: 'Dataset Curation', desc: 'Raw CTI ingestion, SHA-256 integrity, TLP taxonomy', link: 'repository' as NavigationPage },
            { step: '02', name: 'Souvik Pal', title: 'Hybrid Retrieval & RAG', desc: 'Sliding chunking, dual BM25+vector, Gemini 3.8 grounding, IOC & MITRE', link: 'retrieval' as NavigationPage },
            { step: '03', name: 'Subhajit Giri', title: 'Verification & Trust', desc: 'Claim decomposition, 3-label entailment, multi-factor scoring, safety abstention', link: 'verification' as NavigationPage },
            { step: '04', name: 'Keshav Dutta', title: 'Dashboard & Evaluation', desc: 'Cross-module telemetry, 7-dimension benchmark suite, human review console', link: 'evaluation' as NavigationPage }
          ].map((node, i) => (
            <div
              key={i}
              onClick={() => onNavigate(node.link)}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-teal-400/50 p-4 rounded-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between font-mono text-[11px] text-teal-400 mb-2">
                  <span className="font-bold">STAGE {node.step}</span>
                  <span className="text-slate-400 group-hover:text-white transition-colors">&rarr;</span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                  {node.name}
                </h4>
                <div className="text-xs text-slate-300 font-medium mt-0.5">{node.title}</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{node.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-teal-400 font-mono flex items-center gap-1">
                <span>View Module</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Team Member Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEAM_MEMBERS.map((member) => {
          const Icon = getMemberIcon(member.pipelineStage);
          return (
            <div
              key={member.name}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{member.name}</h3>
                      <p className="text-xs text-teal-700 font-medium">{member.role}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    STAGE {member.pipelineStage}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium">
                  <strong>Focus Area:</strong> {member.focusArea}
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Delivered Engineering Components:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {member.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 font-semibold">{member.moduleName}</span>
                <button
                  onClick={() => onNavigate(getTargetView(member.pipelineStage))}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
