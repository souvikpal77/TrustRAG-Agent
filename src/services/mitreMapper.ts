import { MITREMapping } from '../types';

export interface AuthenticMitreDefinition {
  id: string;
  name: string;
  tactic: string;
  keywords: string[];
}

// Authentic MITRE ATT&CK Enterprise Matrix Reference Repository
export const MITRE_ATTACK_DB: AuthenticMitreDefinition[] = [
  {
    id: 'T1566.002',
    name: 'Spearphishing Link',
    tactic: 'Initial Access',
    keywords: ['spearphishing', 'phishing link', 'malicious link', 'hyperlink', 'invoice link', 'email link']
  },
  {
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    tactic: 'Initial Access',
    keywords: ['malicious attachment', 'phishing attachment', 'macro document', 'invoice.pdf', 'invoice.exe']
  },
  {
    id: 'T1059.001',
    name: 'PowerShell Execution',
    tactic: 'Execution',
    keywords: ['powershell', 'powershell.exe', '-nop -w hidden', '-enc', 'encodedcommand', 'invoke-webrequest']
  },
  {
    id: 'T1059.003',
    name: 'Windows Command Shell',
    tactic: 'Execution',
    keywords: ['cmd.exe', 'batch script', 'command line execution']
  },
  {
    id: 'T1071.001',
    name: 'Web Protocols (HTTP/HTTPS)',
    tactic: 'Command and Control',
    keywords: ['http polling', 'beaconing', 'c2 server', 'beacon.php', 'outbound http', 'port 8080', 'port 80']
  },
  {
    id: 'T1571',
    name: 'Non-Standard Port',
    tactic: 'Command and Control',
    keywords: ['non-standard port', 'port 9898', 'raw tcp port', 'alternative port']
  },
  {
    id: 'T1053.005',
    name: 'Scheduled Task',
    tactic: 'Persistence',
    keywords: ['scheduled task', 'schtasks', 'telemetrysync', 'task scheduler', 'cron job']
  },
  {
    id: 'T1078',
    name: 'Valid Accounts',
    tactic: 'Initial Access / Defense Evasion',
    keywords: ['valid accounts', 'compromised credentials', 'vpn login', 'default credentials', 'root:root']
  },
  {
    id: 'T1110.001',
    name: 'Password Guessing',
    tactic: 'Credential Access',
    keywords: ['password guessing', 'brute-forcing', 'dictionary attack', 'default password', 'weak credential']
  },
  {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    tactic: 'Impact',
    keywords: ['data encrypted', 'ransomware', 'aes-256 volume encryption', '.ransomlock', 'ransom note']
  },
  {
    id: 'T1490',
    name: 'Inhibit System Recovery',
    tactic: 'Impact',
    keywords: ['inhibit system recovery', 'vssadmin delete shadows', 'shadow copy', 'delete shadows']
  },
  {
    id: 'T1041',
    name: 'Exfiltration Over C2 Channel',
    tactic: 'Exfiltration',
    keywords: ['exfiltrated', 'exfiltration', 'bulk data staging', 'data upload', 'exfiltrated to']
  },
  {
    id: 'T1027',
    name: 'Obfuscated Files or Information',
    tactic: 'Defense Evasion',
    keywords: ['obfuscated', 'encoded string', 'base64 payload', 'packed binary']
  },
  {
    id: 'T1499',
    name: 'Endpoint Denial of Service',
    tactic: 'Impact',
    keywords: ['denial of service', 'resource exhaustion', 'firmware crash', 'dos attack']
  }
];

/**
 * Maps CTI text to candidate MITRE ATT&CK techniques based strictly on textual evidence
 */
export function mapEvidenceToMITRE(evidenceText: string): MITREMapping[] {
  if (!evidenceText) return [];

  const lower = evidenceText.toLowerCase();
  const mappings: MITREMapping[] = [];
  const addedIds = new Set<string>();

  for (const item of MITRE_ATTACK_DB) {
    // Check if explicit technique ID is mentioned in text (e.g. "T1566.002")
    const idMentioned = lower.includes(item.id.toLowerCase());
    
    // Check for keyword matches
    const matchedKeywords = item.keywords.filter(k => lower.includes(k.toLowerCase()));
    
    if (idMentioned || matchedKeywords.length > 0) {
      if (!addedIds.has(item.id)) {
        addedIds.add(item.id);

        // Find snippet context
        const searchWord = idMentioned ? item.id : matchedKeywords[0];
        const idx = lower.indexOf(searchWord.toLowerCase());
        const start = Math.max(0, idx - 40);
        const end = Math.min(evidenceText.length, idx + searchWord.length + 80);
        const excerpt = `...${evidenceText.substring(start, end).replace(/\n/g, ' ').trim()}...`;

        const localContext = evidenceText.substring(Math.max(0, idx - 60), Math.min(evidenceText.length, idx + searchWord.length + 120)).toLowerCase();
        const explicitlyCandidate =
          localContext.includes('candidate') ||
          localContext.includes('hypothesis') ||
          localContext.includes('requires analyst') ||
          localContext.includes('unconfirmed') ||
          localContext.includes('suspected');

        const isDirectlySupported = !explicitlyCandidate && (idMentioned || matchedKeywords.length >= 2);

        mappings.push({
          techniqueId: item.id,
          techniqueName: item.name,
          tactic: item.tactic,
          candidateEvidence: excerpt,
          status: isDirectlySupported ? 'SUPPORTED_BY_EVIDENCE' : 'CANDIDATE_REQUIRES_ANALYST_VALIDATION',
          confidence: isDirectlySupported ? (idMentioned ? 'high' : 'medium') : 'low'
        });
      }
    }
  }

  // Sort: supported first, then by confidence
  return mappings.sort((a, b) => {
    if (a.status === 'SUPPORTED_BY_EVIDENCE' && b.status !== 'SUPPORTED_BY_EVIDENCE') return -1;
    if (b.status === 'SUPPORTED_BY_EVIDENCE' && a.status !== 'SUPPORTED_BY_EVIDENCE') return 1;
    return a.techniqueId.localeCompare(b.techniqueId);
  });
}
