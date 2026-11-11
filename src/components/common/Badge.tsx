import React from 'react';
import { ClaimStatus, TLPClassification } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  size = 'sm'
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const ClaimStatusBadge: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  if (status === 'SUPPORTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        SUPPORTED
      </span>
    );
  }
  if (status === 'CONTRADICTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        CONTRADICTED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
      UNRESOLVED
    </span>
  );
};

export const TLPBadge: React.FC<{ tlp: TLPClassification }> = ({ tlp }) => {
  const styles = {
    WHITE: 'bg-slate-100 text-slate-800 border-slate-300',
    GREEN: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    AMBER: 'bg-amber-100 text-amber-800 border-amber-300',
    RED: 'bg-rose-100 text-rose-800 border-rose-300'
  };

  return (
    <span className={`inline-flex items-center font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles[tlp]}`}>
      TLP:{tlp}
    </span>
  );
};
