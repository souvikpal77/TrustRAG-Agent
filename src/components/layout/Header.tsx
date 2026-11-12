import React from 'react';
import { ShieldCheck, Cpu, Upload, Sparkles, AlertTriangle, Menu } from 'lucide-react';
import { NavigationPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  geminiConfigured: boolean;
  configuredModel?: string;
  totalDocs: number;
  lastAnalysisTimestamp?: string;
  onQuickUpload?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  geminiConfigured,
  configuredModel,
  totalDocs,
  lastAnalysisTimestamp,
  onQuickUpload,
  onToggleMobileMenu
}) => {
  const getPageTitle = (page: NavigationPage) => {
    switch (page) {
      case 'dashboard': return 'Overview Dashboard';
      case 'repository': return 'Module 1 — CTI Document Repository (Swapnil)';
      case 'ingestion': return 'Module 2 — Document Ingestion & Chunking (Souvik Pal)';
      case 'retrieval': return 'Module 2 — Hybrid Retrieval Engine (Souvik Pal)';
      case 'analysis': return 'Module 2 — AI Threat Analysis (Souvik Pal)';
      case 'iocs': return 'Module 2 — IOC Extraction & Defanging (Souvik Pal)';
      case 'mitre': return 'Module 2 — MITRE ATT&CK Mapping (Souvik Pal)';
      case 'verification': return 'Module 3 — Claim-Level Verification (Subhajit Giri)';
      case 'trust': return 'Module 3 — Trust Assessment Engine (Subhajit Giri)';
      case 'evaluation': return 'Module 4 — Evaluation Centre (Keshav Dutta)';
      case 'team': return 'Module 4 — Team Contributions & Workflow (Keshav Dutta)';
      case 'settings': return 'System Settings & Audit Log';
      default: return 'TrustRAG-Agent';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Title & Breadcrumbs */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-teal-700 tracking-wide uppercase">TrustRAG-Agent</span>
            <span className="text-slate-300">/</span>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
              {getPageTitle(currentPage)}
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
            Evidence-Based Cyber Threat Intelligence Analysis Framework
          </p>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3">
        {/* Gemini Engine Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-teal-600" />
          <span className="font-mono text-[11px]">{configuredModel || 'gemini-3.1-flash-lite'}</span>
          {geminiConfigured ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="API Key Connected via Environment" />
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-amber-700 font-normal">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Fallback Ready
            </span>
          )}
        </div>

        {/* Security Delimiter Shield */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px]">Strict Delimiter Isolation</span>
        </div>

        {/* Primary Action Button */}
        {currentPage !== 'analysis' && (
          <button
            onClick={() => onNavigate('analysis')}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run Analysis</span>
          </button>
        )}

        {currentPage !== 'repository' && onQuickUpload && (
          <button
            onClick={onQuickUpload}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload CTI</span>
          </button>
        )}
      </div>
    </header>
  );
};
