import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sliders,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info,
  Scale,
  Award,
  Clock,
  Sparkles
} from 'lucide-react';
import { AnalysisQueryRecord, TrustWeights } from '../../types';
import { DEFAULT_TRUST_WEIGHTS } from '../../data/sampleData';

interface TrustAssessmentViewProps {
  activeAnalysis: AnalysisQueryRecord | null;
  trustWeights: TrustWeights;
  onUpdateWeights: (newWeights: TrustWeights) => void;
}

export const TrustAssessmentView: React.FC<TrustAssessmentViewProps> = ({
  activeAnalysis,
  trustWeights,
  onUpdateWeights
}) => {
  const [weights, setWeights] = useState<TrustWeights>(trustWeights);
  const trust = activeAnalysis?.trustAssessment;

  useEffect(() => {
    setWeights(trustWeights);
  }, [trustWeights]);

  const totalRawWeight =
    weights.provenance +
    weights.authority +
    weights.relevance +
    weights.entailment +
    weights.freshness +
    weights.modelConfidence || 1;

  const handleSliderChange = (factor: keyof TrustWeights, value: number) => {
    const updated = { ...weights, [factor]: value };
    setWeights(updated);
    onUpdateWeights(updated);
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_TRUST_WEIGHTS);
    onUpdateWeights(DEFAULT_TRUST_WEIGHTS);
  };

  const factorConfig = [
    { key: 'provenance' as keyof TrustWeights, label: 'Source Provenance & Hash Integrity', desc: 'Cryptographic SHA-256 verification and TLP data classifications' },
    { key: 'authority' as keyof TrustWeights, label: 'Source Authority & Credibility', desc: 'Reputation tier of reporting body (CISA, ISAC vs unverified forums)' },
    { key: 'relevance' as keyof TrustWeights, label: 'Passage Relevance & Vector Distance', desc: 'Hybrid retrieval score across top-ranked evidence chunks' },
    { key: 'entailment' as keyof TrustWeights, label: 'Claim Entailment Ratio', desc: 'Proportion of atomic assertions corroborated by document text' },
    { key: 'freshness' as keyof TrustWeights, label: 'Temporal Freshness', desc: 'Recency of reported indicators against current threat lifecycle' },
    { key: 'modelConfidence' as keyof TrustWeights, label: 'Reasoning Model Calibration', desc: 'Calibrated certainty of LLM generation tokens' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Module Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              MODULE 3: SUBHAJIT GIRI
            </span>
            <span className="text-xs text-slate-500">Multi-Factor Trust Scoring & Abstention</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Trust Calibration & Abstention Policy Engine</h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Transparently combines provenance, authority, passage relevance, and claim entailment into a weighted composite score with automatic safety abstentions.
          </p>
        </div>

        <button
          onClick={handleResetWeights}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Default Weights</span>
        </button>
      </div>

      {/* Experimental Scientific Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">ACADEMIC RESEARCH & OPERATIONAL DISCLAIMER:</strong>
          <span>
            A numerical trust score is an experimental assessment, not proof that information is true. It does not represent a scientifically validated probability. Security analysts must inspect cited passages prior to taking defensive or blocking actions.
          </span>
        </div>
      </div>

      {/* Top Level Score Overview Card */}
      {trust ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Composite Trust Score
            </span>
            <div className="text-5xl font-extrabold text-slate-900 font-mono">
              {trust.overallScore}
              <span className="text-2xl text-slate-400 font-normal">/100</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              trust.overallScore >= 80
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {trust.riskLevel.replace('_', ' ')}
            </span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 col-span-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-600" />
              Formula & Operational Weights
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-700 leading-relaxed border border-slate-200">
              TrustScore = &Sigma;(w&#7522; / &Sigma;w) &times; FactorScore&#7522; &nbsp;|&nbsp; Raw Weight Sum: {totalRawWeight.toFixed(2)} (auto-normalized to 100%)
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>Abstention Threshold Triggered:</span>
              <span className={`font-semibold ${trust.abstentionTriggered ? 'text-rose-600' : 'text-emerald-600'}`}>
                {trust.abstentionTriggered ? 'YES (Abstention Active)' : 'NO (Sufficient Evidence)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Flagged for Human Review:</span>
              <span className="font-semibold text-amber-700">
                {trust.flaggedForHumanReview ? 'Required (Analyst Sign-off)' : 'Optional'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
          No analysis active. Run an intelligence inquiry on the AI Threat Analysis page to view the live trust calculation.
        </div>
      )}

      {/* Interactive Weight Tuning & Factor Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Interactive Trust Factor Weights & Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Adjust sliders to simulate analyst prioritization profiles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {factorConfig.map(({ key, label, desc }) => {
            const currentWeight = weights[key];
            const normalizedShare = ((currentWeight / totalRawWeight) * 100).toFixed(1);
            const factorDetail = trust?.factors?.[key];

            return (
              <div
                key={key}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-900">{label}</span>
                  <span className="font-mono text-xs text-teal-700 font-bold flex-shrink-0">
                    {normalizedShare}% Effective <span className="text-slate-400 font-normal">({currentWeight.toFixed(2)})</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{desc}</p>

                <input
                  type="range"
                  min={0.05}
                  max={0.50}
                  step={0.05}
                  value={currentWeight}
                  onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />

                {factorDetail && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Calculated Score:</span>
                    <span className="font-mono font-bold text-slate-800">{factorDetail.score} / 100</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
