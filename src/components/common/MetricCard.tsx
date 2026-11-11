import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'teal';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  badge,
  badgeVariant = 'teal',
  className = ''
}) => {
  const badgeClasses = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200'
  };

  return (
    <div className={`bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{label}</span>
        <div className="p-2 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
          <Icon className="w-4 h-4 text-teal-600" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
        {badge && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${badgeClasses[badgeVariant]}`}>
            {badge}
          </span>
        )}
      </div>
      {subValue && (
        <p className="mt-1 text-xs text-slate-500 font-normal leading-relaxed truncate">{subValue}</p>
      )}
    </div>
  );
};
