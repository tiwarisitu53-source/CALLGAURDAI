export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecommendedAction = 'CONNECT' | 'SCREEN_FURTHER' | 'BLOCK';
export type CallStatus = 'INCOMING' | 'BLOCKED_LAYER1' | 'SCREENING' | 'CONNECTED' | 'BLOCKED_AI' | 'COMPLETED';

export interface ReputationResult {
  score: number; // 0 = safe, 100 = definite spam
  isSpam: boolean;
  category: string;
  provider: 'Truecaller' | 'LocalSpamDatabase' | 'UserReport' | 'MultiProvider';
  confidence: number;
  reportsCount: number;
  carrier?: string;
  location?: string;
  lookupTimeMs: number;
  details: string;
}

export interface TranscriptEntry {
  id: string;
  role: 'caller' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  riskUpdate?: {
    score: number;
    level: RiskLevel;
    signals: string[];
    action: RecommendedAction;
  };
}

export interface RiskAnalysis {
  risk_score: number; // 0-100
  risk_level: RiskLevel;
  intent: string;
  scam_category: string;
  signals: string[];
  explanation: string;
  recommended_action: RecommendedAction;
  confidence?: number;
}

export interface CallRecord {
  id: string;
  callerNumber: string;
  callerName: string;
  status: CallStatus;
  reputation: ReputationResult;
  riskScore: number;
  riskLevel: RiskLevel;
  intent: string;
  scamCategory: string;
  detectedSignals: string[];
  explanation: string;
  recommendedAction: RecommendedAction;
  transcript: TranscriptEntry[];
  screeningDurationSec: number;
  createdAt: string;
  userFeedback?: 'CONFIRMED_SPAM' | 'FALSE_POSITIVE' | 'LEGITIMATE';
  telephonySource: 'twilio' | 'simulator' | 'android';
}

export interface DashboardStats {
  totalCalls: number;
  safeCalls: number;
  suspiciousCalls: number;
  blockedCalls: number;
  avgRiskScore: number;
  layer1Blocked: number;
  layer2Blocked: number;
  signalsFrequency: { [signal: string]: number };
  categoryDistribution: { [category: string]: number };
}

export interface DemoTurn {
  turnIndex: number;
  stageName: string;
  elapsedSec: number;
  callerSpeech: string;
  expectedAiResponse?: string;
  expectedAction?: RecommendedAction;
}

export interface DemoScenario {
  id: string;
  name: string;
  tag: string;
  callerNumber: string;
  callerName: string;
  callerOpening: string;
  followUpTrigger?: string;
  followUpCallerResponse?: string;
  expectedRiskLevel: RiskLevel;
  expectedAction: RecommendedAction;
  expectedSignals: string[];
  notes: string;
  isExtendedScreening?: boolean;
  targetDurationSec?: number;
  turns?: DemoTurn[];
}
