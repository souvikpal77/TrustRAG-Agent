import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { RepositoryView } from './components/views/RepositoryView';
import { IngestionView } from './components/views/IngestionView';
import { RetrievalView } from './components/views/RetrievalView';
import { AnalysisView } from './components/views/AnalysisView';
import { ClaimVerificationView } from './components/views/ClaimVerificationView';
import { TrustAssessmentView } from './components/views/TrustAssessmentView';
import { IOCExtractionView } from './components/views/IOCExtractionView';
import { MitreMappingView } from './components/views/MitreMappingView';
import { EvaluationCentreView } from './components/views/EvaluationCentreView';
import { TeamContributionsView } from './components/views/TeamContributionsView';
import { SettingsView } from './components/views/SettingsView';

import {
  AnalysisQueryRecord,
  ClaimStatus,
  CTIDocument,
  DocumentChunk,
  RetrievalResult,
  TrustWeights
} from './types';
import {
  INITIAL_CTI_DOCUMENTS,
  INITIAL_CHUNKS,
  DEFAULT_TRUST_WEIGHTS,
  PRESET_QUERIES
} from './data/sampleData';
import { checkServerHealth, recordAuditLog } from './services/api';
import { extractIOCsFromText } from './services/iocExtractor';
import { mapEvidenceToMITRE } from './services/mitreMapper';
import { calculateTrustAssessment } from './services/trustEngine';
import { chunkDocument } from './services/textProcessing';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [documents, setDocuments] = useState<CTIDocument[]>(INITIAL_CTI_DOCUMENTS);
  const [chunks, setChunks] = useState<DocumentChunk[]>(INITIAL_CHUNKS);
  const [trustWeights, setTrustWeights] = useState<TrustWeights>(DEFAULT_TRUST_WEIGHTS);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [openUploadModal, setOpenUploadModal] = useState<boolean>(false);

  // Initial demonstration analysis record seeded on load
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisQueryRecord[]>(() => {
    const seedChunks = INITIAL_CHUNKS.slice(0, 3);
    const mockEvidence: RetrievalResult[] = seedChunks.map((c, i) => ({
      chunk: c,
      semanticScore: 0.92 - (i * 0.05),
      keywordScore: 0.95 - (i * 0.04),
      hybridScore: 0.93 - (i * 0.04),
      relevanceTier: i === 0 ? 'HIGH' : 'MODERATE',
      matchedEntities: ['203.0.113.25', 'WS-FIN-089', 'T1071.001'],
      matchHighlights: [c.content.substring(0, 120) + '...'],
      retrievalMethod: 'hybrid'
    }));

    const sampleQuery = PRESET_QUERIES[0];
    const sampleAnswer = `### Threat Intelligence Corroboration: APT-SYN-042

Based on the evidence retrieved from **APT-SYN-042_Phishing_C2_Report.txt**, the primary suspicious external endpoint is **203.0.113.25** [APT-SYN-042_Phishing_C2_Report.txt, Chunk #0].

#### Activity Summary:
1. **Outbound Beaconing**: Internal workstation **WS-FIN-089** (10.0.4.112) conducted repeated outbound connections and secondary HTTP polling on port 8080 to **203.0.113.25** at regular 60-second intervals [APT-SYN-042_Phishing_C2_Report.txt, Chunk #0, #2].
2. **Initial Ingress**: The adversary initiated contact via an email containing a malicious invoice hyperlink directing to **update-check.fake-telemetry.example.org** [APT-SYN-042_Phishing_C2_Report.txt, Chunk #1].
3. **Execution & Staging**: An obfuscated PowerShell payload established persistence via scheduled task 'TelemetrySync', deploying dropper hash **e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855** [APT-SYN-042_Phishing_C2_Report.txt, Chunk #1, #2].

*(Note: In accordance with RFC 5737, 203.0.113.25 resides within TEST-NET-3 documentation space for safe analysis demonstration).*`;

    const sampleClaims = [
      {
        id: 'claim-seed-1',
        claimText: 'Destination IP 203.0.113.25 was observed receiving repeated outbound connections from workstation WS-FIN-089.',
        status: 'SUPPORTED' as ClaimStatus,
        confidence: 96,
        rationale: 'Directly corroborated by Chunk #0 indicating outbound communication to 203.0.113.25.',
        supportingEvidence: ['Workstation WS-FIN-089 communicated repeatedly to external host 203.0.113.25.'],
        contradictingEvidence: [],
        citation: { documentName: 'APT-SYN-042_Phishing_C2_Report.txt', pageNumber: 1, chunkIndex: 0 }
      },
      {
        id: 'claim-seed-2',
        claimText: 'Adversary leveraged an email with a malicious hyperlink to update-check.fake-telemetry.example.org.',
        status: 'SUPPORTED' as ClaimStatus,
        confidence: 94,
        rationale: 'Chunk #1 and Chunk #2 explicitly document the invoice hyperlink and staging domain.',
        supportingEvidence: ['Domain: update-check.fake-telemetry.example.org observed in IOC telemetry.'],
        contradictingEvidence: [],
        citation: { documentName: 'APT-SYN-042_Phishing_C2_Report.txt', pageNumber: 1, chunkIndex: 1 }
      },
      {
        id: 'claim-seed-3',
        claimText: 'The threat actor executed obfuscated PowerShell scripts and registered a scheduled task named TelemetrySync.',
        status: 'SUPPORTED' as ClaimStatus,
        confidence: 92,
        rationale: 'Directly supported in section 3 detailing PowerShell execution and candidate persistence.',
        supportingEvidence: ['T1059.001 PowerShell and candidate persistence TelemetrySync documented in Chunk #2.'],
        contradictingEvidence: [],
        citation: { documentName: 'APT-SYN-042_Phishing_C2_Report.txt', pageNumber: 2, chunkIndex: 2 }
      },
      {
        id: 'claim-seed-4',
        claimText: 'The threat group responsible is definitively identified as state-sponsored APT29.',
        status: 'UNRESOLVED' as ClaimStatus,
        confidence: 30,
        rationale: 'UNRESOLVED: The CTI document does NOT establish authenticated threat actor group attribution.',
        supportingEvidence: [],
        contradictingEvidence: [],
        citation: { documentName: 'APT-SYN-042_Phishing_C2_Report.txt', pageNumber: 1, chunkIndex: 0 }
      }
    ];

    const sampleAssessment = calculateTrustAssessment(sampleClaims, mockEvidence, INITIAL_CTI_DOCUMENTS, DEFAULT_TRUST_WEIGHTS);
    const sampleIocs = extractIOCsFromText(sampleAnswer + '\n' + seedChunks.map(c => c.content).join('\n'), 'APT-SYN-042_Phishing_C2_Report.txt');
    const sampleMitre = mapEvidenceToMITRE(sampleAnswer + '\n' + seedChunks.map(c => c.content).join('\n'));

    return [
      {
        id: 'analysis-seed-01',
        query: sampleQuery,
        timestamp: new Date().toISOString(),
        documentIds: ['doc-sample-1'],
        retrievedChunks: mockEvidence,
        answer: sampleAnswer,
        citations: mockEvidence.map(e => ({
          documentName: e.chunk.documentName,
          chunkIndex: e.chunk.chunkIndex,
          quote: e.chunk.content.substring(0, 100)
        })),
        claims: sampleClaims,
        trustAssessment: sampleAssessment,
        iocs: sampleIocs,
        mitreMappings: sampleMitre,
        latencyMs: 1240,
        modelUsed: 'gemini-3.8-flash'
      }
    ];
  });

  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisQueryRecord | null>(analysisHistory[0] || null);

  useEffect(() => {
    checkServerHealth().then(res => {
      setGeminiConfigured(res.geminiConfigured);
    });
  }, []);

  // Handlers
  const handleAddDocument = (newDoc: CTIDocument) => {
    setDocuments(prev => [newDoc, ...prev]);
    // Generate chunks for new document and add to pool
    const newChunks = chunkDocument(newDoc.id, newDoc.filename, newDoc.rawText, 140, 30);
    setChunks(prev => [...newChunks, ...prev]);
    recordAuditLog('DOCUMENT_INGESTED', `Ingested CTI document ${newDoc.filename} (${newChunks.length} chunks) with SHA-256 ${newDoc.contentHash.substring(0, 12)}...`, 'Swapnil-CTI-Module');
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    setChunks(prev => prev.filter(c => c.documentId !== id));
    recordAuditLog('DOCUMENT_DELETED', `Removed document ID ${id}`, 'Swapnil-CTI-Module');
  };

  const handleResetSamples = () => {
    setDocuments(INITIAL_CTI_DOCUMENTS);
    setChunks(INITIAL_CHUNKS);
    recordAuditLog('RESET_DEMO_DATA', 'Restored default synthetic CTI test documents', 'Swapnil-CTI-Module');
  };

  const handleSaveAnalysis = (record: AnalysisQueryRecord) => {
    setAnalysisHistory(prev => [record, ...prev]);
    setActiveAnalysis(record);
  };

  const handleUpdateClaimStatus = (claimId: string, newStatus: ClaimStatus) => {
    if (!activeAnalysis) return;
    const updatedClaims = activeAnalysis.claims.map(c => 
      c.id === claimId ? { ...c, status: newStatus } : c
    );
    // Recalculate trust with updated claims
    const updatedTrust = calculateTrustAssessment(
      updatedClaims,
      activeAnalysis.retrievedChunks,
      documents,
      trustWeights
    );

    const updatedRecord = {
      ...activeAnalysis,
      claims: updatedClaims,
      trustAssessment: updatedTrust
    };

    setActiveAnalysis(updatedRecord);
    setAnalysisHistory(prev => prev.map(a => a.id === updatedRecord.id ? updatedRecord : a));
    recordAuditLog('CLAIM_OVERRIDE', `Analyst updated claim #${claimId} status to ${newStatus}`, 'Subhajit-Verification-Module');
  };

  const handleUpdateWeights = (newWeights: TrustWeights) => {
    setTrustWeights(newWeights);
    if (activeAnalysis) {
      const recalculated = calculateTrustAssessment(
        activeAnalysis.claims,
        activeAnalysis.retrievedChunks,
        documents,
        newWeights
      );
      const updated = { ...activeAnalysis, trustAssessment: recalculated };
      setActiveAnalysis(updated);
      setAnalysisHistory(prev => prev.map(a => a.id === updated.id ? updated : a));
    }
  };

  const handleRunSampleQuery = (queryText: string, docId?: string) => {
    setPendingQuery(queryText);
    setPendingDocId(docId || 'all');
    setCurrentPage('analysis');
  };

  const handleLaunchAnalysisFromRetrieval = (queryText: string, _evidence: RetrievalResult[], docId?: string) => {
    setPendingQuery(queryText);
    setPendingDocId(docId || 'all');
    setCurrentPage('analysis');
  };

  const handleAnalyzeDoc = (doc: CTIDocument) => {
    setPendingDocId(doc.id);
    setPendingQuery('What suspicious IP address is mentioned in the report, and what activity is described?');
    setCurrentPage('analysis');
  };

  // Aggregate stats
  const totalClaimsCount = analysisHistory.reduce((acc, h) => acc + h.claims.length, 0);
  const totalIOCsCount = analysisHistory.reduce((acc, h) => acc + h.iocs.length, 0);

  return (
    <div className="flex h-screen bg-[#F5F7FA] font-sans overflow-hidden text-slate-800">
      {/* Left Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        docCount={documents.length}
        claimCount={totalClaimsCount}
        iocCount={totalIOCsCount}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          geminiConfigured={geminiConfigured}
          totalDocs={documents.length}
          onQuickUpload={() => {
            setOpenUploadModal(true);
            setCurrentPage('repository');
          }}
        />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && (
            <DashboardView
              documents={documents}
              analysisHistory={analysisHistory}
              activeAnalysis={activeAnalysis}
              onNavigate={setCurrentPage}
              onSelectAnalysis={setActiveAnalysis}
              onRunSampleQuery={handleRunSampleQuery}
            />
          )}

          {currentPage === 'repository' && (
            <RepositoryView
              documents={documents}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onResetSamples={handleResetSamples}
              onAnalyzeDoc={handleAnalyzeDoc}
              defaultOpenUpload={openUploadModal}
            />
          )}

          {currentPage === 'ingestion' && (
            <IngestionView
              documents={documents}
              chunks={chunks}
              onUpdateChunks={setChunks}
              onNavigateToRetrieval={() => setCurrentPage('retrieval')}
            />
          )}

          {currentPage === 'retrieval' && (
            <RetrievalView
              chunks={chunks}
              onLaunchAnalysis={handleLaunchAnalysisFromRetrieval}
              availableDocNames={documents.map(d => ({ id: d.id, name: d.filename }))}
            />
          )}

          {currentPage === 'analysis' && (
            <AnalysisView
              documents={documents}
              chunks={chunks}
              activeAnalysis={activeAnalysis}
              trustWeights={trustWeights}
              onSaveAnalysis={handleSaveAnalysis}
              onNavigateToView={setCurrentPage}
              initialQuery={pendingQuery || undefined}
              initialDocId={pendingDocId || undefined}
              onClearInitialQuery={() => {
                setPendingQuery(null);
                setPendingDocId(null);
              }}
            />
          )}

          {currentPage === 'verification' && (
            <ClaimVerificationView
              activeAnalysis={activeAnalysis}
              onUpdateClaimStatus={handleUpdateClaimStatus}
              chunks={chunks}
            />
          )}

          {currentPage === 'trust' && (
            <TrustAssessmentView
              activeAnalysis={activeAnalysis}
              trustWeights={trustWeights}
              onUpdateWeights={handleUpdateWeights}
            />
          )}

          {currentPage === 'iocs' && (
            <IOCExtractionView
              activeAnalysis={activeAnalysis}
              allHistoricalIOCs={analysisHistory.flatMap(a => a.iocs)}
            />
          )}

          {currentPage === 'mitre' && (
            <MitreMappingView
              activeAnalysis={activeAnalysis}
            />
          )}

          {currentPage === 'evaluation' && (
            <EvaluationCentreView
              onRunTestQuery={(q) => {
                setPendingQuery(q);
                setCurrentPage('analysis');
              }}
            />
          )}

          {currentPage === 'team' && (
            <TeamContributionsView
              onNavigate={setCurrentPage}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
