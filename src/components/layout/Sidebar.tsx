import React from 'react';
import {
  LayoutDashboard,
  FolderArchive,
  FileInput,
  Search,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Binary,
  Target,
  BarChart3,
  Users2,
  Settings,
  ChevronRight,
  ShieldAlert,
  X
} from 'lucide-react';

export type NavigationPage = 
  | 'dashboard'
  | 'repository'
  | 'ingestion'
  | 'retrieval'
  | 'analysis'
  | 'verification'
  | 'trust'
  | 'iocs'
  | 'mitre'
  | 'evaluation'
  | 'team'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  docCount: number;
  claimCount: number;
  iocCount: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  docCount,
  claimCount,
  iocCount,
  isMobileOpen = false,
  onMobileClose
}) => {
  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard' as NavigationPage, label: 'Overview Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'MODULE 1 — SWAPNIL',
      items: [
        { id: 'repository' as NavigationPage, label: 'CTI Document Repository', icon: FolderArchive, badge: docCount }
      ]
    },
    {
      title: 'MODULE 2 — SOUVIK PAL',
      items: [
        { id: 'ingestion' as NavigationPage, label: 'Document Ingestion', icon: FileInput },
        { id: 'retrieval' as NavigationPage, label: 'Hybrid Retrieval', icon: Search },
        { id: 'analysis' as NavigationPage, label: 'AI Threat Analysis', icon: Cpu, isPrimary: true },
        { id: 'iocs' as NavigationPage, label: 'IOC Extraction', icon: Binary, badge: iocCount },
        { id: 'mitre' as NavigationPage, label: 'MITRE ATT&CK Mapping', icon: Target }
      ]
    },
    {
      title: 'MODULE 3 — SUBHAJIT GIRI',
      items: [
        { id: 'verification' as NavigationPage, label: 'Claim Verification', icon: CheckCircle2, badge: claimCount },
        { id: 'trust' as NavigationPage, label: 'Trust Assessment', icon: ShieldCheck }
      ]
    },
    {
      title: 'MODULE 4 — KESHAV DUTTA',
      items: [
        { id: 'evaluation' as NavigationPage, label: 'Evaluation Centre', icon: BarChart3 },
        { id: 'team' as NavigationPage, label: 'Team Contributions', icon: Users2 }
      ]
    },
    {
      title: 'SYSTEM CONTROLS',
      items: [
        { id: 'settings' as NavigationPage, label: 'Settings & Audit Log', icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside className={`w-64 bg-[#172B4D] text-slate-300 flex flex-col h-screen flex-shrink-0 select-none border-r border-[#243B53] z-50 transition-transform duration-200 fixed md:static inset-y-0 left-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#243B53] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                TrustRAG<span className="text-teal-400 font-mono text-xs px-1.5 py-0.5 rounded bg-teal-950 border border-teal-800">AGENT</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">Evidence-Based CTI Framework</p>
            </div>
          </div>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs font-medium scrollbar-thin">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      if (onMobileClose) onMobileClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-left group cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white font-semibold shadow-sm'
                        : 'hover:bg-[#243B53]/70 text-slate-300 hover:text-white'
                    }`}
                  >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-300'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                      isActive ? 'bg-teal-800 text-teal-100' : 'bg-[#243B53] text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.isPrimary && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Academic Citation Footer */}
      <div className="p-3 border-t border-[#243B53] bg-[#12233f] text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
          <span>PROJECT STATUS</span>
          <span className="text-teal-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> ACTIVE
          </span>
        </div>
        <p className="truncate text-slate-300 font-medium">CS IoT, Cyber & Blockchain</p>
        <p className="text-[10px] text-slate-500">Academic Prototype v1.0</p>
      </div>
    </aside>
    </>
  );
};
