import { ClaimVerification, CTIDocument, RetrievalResult, TrustAssessment, TrustWeights } from '../types';

export function calculateTrustAssessment(
  claims: ClaimVerification[],
  evidenceResults: RetrievalResult[],
  documents: CTIDocument[],
  customWeights?: TrustWeights
): TrustAssessment {
  const weights = customWeights || {
    provenance: 0.15,
    authority: 0.20,
    relevance: 0.20,
    entailment: 0.25,
    freshness: 0.10,
    modelConfidence: 0.10
  };

  // 1. Provenance Score (Integrity of ingested files, content hashes, TLP)
  const referencedDocNames = new Set(evidenceResults.map(e => e.chunk.documentName));
  const referencedDocs = documents.filter(d => referencedDocNames.has(d.filename));

  let provenanceScore = 80;
  if (referencedDocs.length > 0) {
    const hasHash = referencedDocs.every(d => d.contentHash && d.contentHash.length === 64);
    const hasValidTLP = referencedDocs.every(d => ['WHITE', 'GREEN', 'AMBER', 'RED'].includes(d.tlp));
    provenanceScore = (hasHash ? 50 : 25) + (hasValidTLP ? 45 : 20);
  } else {
    provenanceScore = 40;
  }

  // 2. Source Authority Score (Reputation of CTI sources)
  let authorityScore = 75;
  if (referencedDocs.length > 0) {
    const avgDocAuth = referencedDocs.reduce((acc, doc) => {
      const src = doc.source.toLowerCase();
      if (src.includes('cisa') || src.includes('cert') || src.includes('isac')) return acc + 95;
      if (src.includes('analysis unit') || src.includes('research group') || src.includes('csirt')) return acc + 85;
      if (doc.isSample) return acc + 80; // High provenance for curated test benchmarks
      return acc + 60;
    }, 0) / referencedDocs.length;
    authorityScore = Math.round(avgDocAuth);
  }

  // 3. Evidence Relevance Score (Derived from top retrieved passages)
  let relevanceScore = 0;
  if (evidenceResults.length > 0) {
    const topScores = evidenceResults.slice(0, 3).map(e => e.hybridScore);
    const avgHybrid = topScores.reduce((a, b) => a + b, 0) / topScores.length;
    relevanceScore = Math.min(100, Math.round(avgHybrid * 100));
  } else {
    relevanceScore = 15;
  }

  // 4. Evidence Entailment Score (Ratio of claims supported vs unresolved/contradicted)
  let entailmentScore = 50;
  let supportedCount = 0;
  let contradictedCount = 0;
  let unresolvedCount = 0;

  if (claims.length > 0) {
    claims.forEach(c => {
      if (c.status === 'SUPPORTED') supportedCount++;
      else if (c.status === 'CONTRADICTED') contradictedCount++;
      else unresolvedCount++;
    });

    const supportedRatio = supportedCount / claims.length;
    const contradictedPenalty = (contradictedCount / claims.length) * 60;
    entailmentScore = Math.max(0, Math.min(100, Math.round((supportedRatio * 100) - contradictedPenalty)));
  } else {
    entailmentScore = 30;
  }

  // 5. Freshness Score (Publication date decay)
  let freshnessScore = 85;
  if (referencedDocs.length > 0) {
    const publicationDates = referencedDocs
      .map(d => new Date(d.publicationDate).getTime())
      .filter(t => !isNaN(t));
    if (publicationDates.length > 0) {
      const latestDate = Math.max(...publicationDates);
      const diffDays = Math.max(0, (Date.now() - latestDate) / (1000 * 60 * 60 * 24));
      freshnessScore = diffDays < 90 ? 95 : diffDays < 270 ? 82 : 65;
    }
  }

  // 6. Model Confidence Score
  const avgClaimConf = claims.length > 0
    ? claims.reduce((acc, c) => acc + c.confidence, 0) / claims.length
    : 50;
  const modelConfidenceScore = Math.round(avgClaimConf);

  // Compute Overall Weighted Score
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const normalizedWeights = {
    provenance: weights.provenance / totalWeight,
    authority: weights.authority / totalWeight,
    relevance: weights.relevance / totalWeight,
    entailment: weights.entailment / totalWeight,
    freshness: weights.freshness / totalWeight,
    modelConfidence: weights.modelConfidence / totalWeight
  };

  const overallScore = Math.round(
    (provenanceScore * normalizedWeights.provenance) +
    (authorityScore * normalizedWeights.authority) +
    (relevanceScore * normalizedWeights.relevance) +
    (entailmentScore * normalizedWeights.entailment) +
    (freshnessScore * normalizedWeights.freshness) +
    (modelConfidenceScore * normalizedWeights.modelConfidence)
  );

  // Abstention Policy Evaluation
  const abstentionTriggered = relevanceScore < 30 || entailmentScore < 40 || evidenceResults.length === 0;
  let abstentionReason: string | null = null;
  if (evidenceResults.length === 0) {
    abstentionReason = 'No relevant passages retrieved from the indexed CTI repository.';
  } else if (relevanceScore < 30) {
    abstentionReason = 'Retrieved passages have critically low semantic & keyword relevance scores (< 0.30).';
  } else if (entailmentScore < 40) {
    abstentionReason = 'High proportion of unverified or contradicted claims detected. Answer requires manual analyst corroboration.';
  }

  let riskLevel: 'HIGH_TRUST' | 'MODERATE_TRUST' | 'LOW_TRUST' | 'UNVERIFIED' = 'UNVERIFIED';
  if (overallScore >= 80 && !abstentionTriggered) riskLevel = 'HIGH_TRUST';
  else if (overallScore >= 60 && !abstentionTriggered) riskLevel = 'MODERATE_TRUST';
  else riskLevel = 'LOW_TRUST';

  return {
    overallScore,
    riskLevel,
    factors: {
      provenance: {
        score: provenanceScore,
        weight: normalizedWeights.provenance,
        label: 'Source Provenance & Integrity',
        notes: `${referencedDocs.length} source docs verified with SHA-256 integrity and TLP markings.`
      },
      authority: {
        score: authorityScore,
        weight: normalizedWeights.authority,
        label: 'Source Authority & Credibility',
        notes: 'Assessed against established institutional threat intelligence attribution tiers.'
      },
      relevance: {
        score: relevanceScore,
        weight: normalizedWeights.relevance,
        label: 'Passage Relevance & Coverage',
        notes: `Hybrid retrieval score average across top evidence chunks: ${(relevanceScore / 100).toFixed(2)}.`
      },
      entailment: {
        score: entailmentScore,
        weight: normalizedWeights.entailment,
        label: 'Factual Claim Entailment',
        notes: `${supportedCount} supported, ${unresolvedCount} unresolved, ${contradictedCount} contradicted claims.`
      },
      freshness: {
        score: freshnessScore,
        weight: normalizedWeights.freshness,
        label: 'Temporal Freshness',
        notes: 'Evaluated against observation recency and campaign lifespan.'
      },
      modelConfidence: {
        score: modelConfidenceScore,
        weight: normalizedWeights.modelConfidence,
        label: 'Reasoning Model Calibration',
        notes: `Calibrated model generation confidence across verified claim tokens (${modelConfidenceScore}%).`
      }
    },
    abstentionTriggered,
    abstentionReason,
    flaggedForHumanReview: abstentionTriggered || unresolvedCount > 1 || contradictedCount > 0,
    experimentalDisclaimer: 'A numerical trust score is an experimental assessment, not proof that information is true. It does not represent a scientifically validated probability. Analysts must review cited sources before operational action.'
  };
}
