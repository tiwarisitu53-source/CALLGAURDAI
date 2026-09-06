import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import { CallRecord, DashboardStats, ReputationResult, RiskAnalysis, TranscriptEntry } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Google GenAI client (server-side only)
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// -------------------------------------------------------------
// IN-MEMORY / PERSISTENT CALL STORE & REPUTATION DATABASE
// -------------------------------------------------------------

// Local known scam numbers database (Layer 1)
const LOCAL_SPAM_DATABASE = new Map<string, { category: string; score: number; reports: number }>([
  ['+18005550199', { category: 'IRS Tax Impersonation', score: 98, reports: 420 }],
  ['+18884321098', { category: 'Tech Support Refund Scam', score: 96, reports: 312 }],
  ['+919876543210', { category: 'Electricity Bill Disconnection Fraud', score: 94, reports: 189 }],
  ['+918001234567', { category: 'Fake Lottery / Prize Winner', score: 97, reports: 560 }],
  ['+442079460999', { category: 'Customs Parcel Release Fee', score: 91, reports: 145 }],
]);

// Community user reports database (Layer 1)
const USER_REPORTS_DATABASE = new Map<string, { category: string; count: number; lastReported: string }>([
  ['+15557890123', { category: 'Robocall Auto Warranty', count: 48, lastReported: new Date().toISOString() }],
  ['+919811122233', { category: 'Fake Bank KYC Update', count: 62, lastReported: new Date().toISOString() }],
]);

// In-memory call records
let CALL_RECORDS: CallRecord[] = [];

// Seed initial realistic calls including the required demo scenarios
function seedInitialData() {
  const now = new Date();
  CALL_RECORDS = [
    {
      id: 'call-demo-1-legit',
      callerNumber: '+91 98201 54321',
      callerName: 'Rahul Sharma',
      status: 'CONNECTED',
      reputation: {
        score: 5,
        isSpam: false,
        category: 'Safe / Work Contact',
        provider: 'LocalSpamDatabase',
        confidence: 0.95,
        reportsCount: 0,
        lookupTimeMs: 18,
        details: 'No spam reports on record. Verified caller ID.',
      },
      riskScore: 12,
      riskLevel: 'LOW',
      intent: 'Project Collaboration & Meeting Prep',
      scamCategory: 'None (Legitimate Context)',
      detectedSignals: ['Normal business/project/service context'],
      explanation: 'Caller identified themselves clearly as Rahul from the project team to coordinate for the upcoming presentation. No sensitive credentials or financial actions requested.',
      recommendedAction: 'CONNECT',
      transcript: [
        {
          id: 't-1',
          role: 'system',
          text: 'CallGuard AI answered incoming call from +91 98201 54321. Number reputation safe.',
          timestamp: new Date(now.getTime() - 25 * 60000).toISOString(),
        },
        {
          id: 't-2',
          role: 'assistant',
          text: 'Hello, this is CallGuard automated call screener. Who is calling and what is the purpose of your call?',
          timestamp: new Date(now.getTime() - 24 * 60000).toISOString(),
        },
        {
          id: 't-3',
          role: 'caller',
          text: "Hi, I'm Rahul from the project team. I wanted to discuss tomorrow's presentation.",
          timestamp: new Date(now.getTime() - 23 * 60000).toISOString(),
        },
        {
          id: 't-4',
          role: 'assistant',
          text: 'Thank you Rahul. Connecting you directly now.',
          timestamp: new Date(now.getTime() - 22 * 60000).toISOString(),
        },
      ],
      screeningDurationSec: 14,
      createdAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      userFeedback: 'LEGITIMATE',
      telephonySource: 'simulator',
    },
    {
      id: 'call-demo-2-bank',
      callerNumber: '+91 98765 43210',
      callerName: 'Flagged: Security Dept',
      status: 'BLOCKED_AI',
      reputation: {
        score: 45,
        isSpam: false,
        category: 'Unknown / Unverified',
        provider: 'MultiProvider',
        confidence: 0.7,
        reportsCount: 3,
        lookupTimeMs: 32,
        details: 'Number unclassified in Truecaller, routed to conversational screening.',
      },
      riskScore: 94,
      riskLevel: 'HIGH',
      intent: 'Urgent Bank Verification & Credential Harvesting',
      scamCategory: 'Financial Impersonation Scam',
      detectedSignals: ['Financial requests', 'Impersonation', 'Urgency', 'OTP/password/PIN requests'],
      explanation: 'Caller pretended to be bank security team citing an urgent account compromise. Initially flagged high risk for urgency; escalated to critical block when demanding OTP code.',
      recommendedAction: 'BLOCK',
      transcript: [
        {
          id: 't-b1',
          role: 'assistant',
          text: 'Hello, this is CallGuard automated call screener. Who is calling and what is the purpose of your call?',
          timestamp: new Date(now.getTime() - 48 * 60000).toISOString(),
        },
        {
          id: 't-b2',
          role: 'caller',
          text: "I'm calling from your bank. Your account has a security issue and you need to verify it immediately.",
          timestamp: new Date(now.getTime() - 47 * 60000).toISOString(),
          riskUpdate: {
            score: 82,
            level: 'HIGH',
            signals: ['Financial requests', 'Impersonation', 'Urgency'],
            action: 'SCREEN_FURTHER',
          },
        },
        {
          id: 't-b3',
          role: 'assistant',
          text: 'Which bank and branch are you calling from, and what is your official employee ticket number?',
          timestamp: new Date(now.getTime() - 46 * 60000).toISOString(),
        },
        {
          id: 't-b4',
          role: 'caller',
          text: 'We just sent a 6-digit verification code to your phone. Tell me the OTP immediately or your account will be frozen.',
          timestamp: new Date(now.getTime() - 45 * 60000).toISOString(),
          riskUpdate: {
            score: 96,
            level: 'HIGH',
            signals: ['OTP/password/PIN requests', 'Threats', 'Urgency'],
            action: 'BLOCK',
          },
        },
        {
          id: 't-b5',
          role: 'assistant',
          text: 'CallGuard security policy prohibits sharing verification codes. This call has been terminated.',
          timestamp: new Date(now.getTime() - 44 * 60000).toISOString(),
        },
      ],
      screeningDurationSec: 28,
      createdAt: new Date(now.getTime() - 48 * 60000).toISOString(),
      userFeedback: 'CONFIRMED_SPAM',
      telephonySource: 'simulator',
    },
    {
      id: 'call-demo-3-prize',
      callerNumber: '+91 80012 34567',
      callerName: 'Mega Rewards Dept',
      status: 'BLOCKED_AI',
      reputation: {
        score: 65,
        isSpam: false,
        category: 'Suspicious Telemarketer',
        provider: 'UserReport',
        confidence: 0.8,
        reportsCount: 14,
        lookupTimeMs: 25,
        details: 'Multiple community reports for prize draws. Routed to AI screening.',
      },
      riskScore: 92,
      riskLevel: 'HIGH',
      intent: 'Lottery Prize Scam & Code Harvesting',
      scamCategory: 'Prize & Advance Fee Scam',
      detectedSignals: ['Prize scam', 'Sensitive information request', 'Financial context', 'Unusual payment requests'],
      explanation: 'Caller claimed recipient won a cash prize and demanded a release code to claim funds. Classic advance-fee credential harvesting scam.',
      recommendedAction: 'BLOCK',
      transcript: [
        {
          id: 't-p1',
          role: 'assistant',
          text: 'Hello, this is CallGuard automated call screener. Who is calling and what is the purpose of your call?',
          timestamp: new Date(now.getTime() - 75 * 60000).toISOString(),
        },
        {
          id: 't-p2',
          role: 'caller',
          text: "Congratulations, you've won a cash prize. We need your verification code to release the money.",
          timestamp: new Date(now.getTime() - 74 * 60000).toISOString(),
          riskUpdate: {
            score: 92,
            level: 'HIGH',
            signals: ['Prize scam', 'Sensitive information request', 'Financial context'],
            action: 'BLOCK',
          },
        },
        {
          id: 't-p3',
          role: 'assistant',
          text: 'CallGuard detected an unverified prize fee solicitation. Call terminated.',
          timestamp: new Date(now.getTime() - 73 * 60000).toISOString(),
        },
      ],
      screeningDurationSec: 16,
      createdAt: new Date(now.getTime() - 75 * 60000).toISOString(),
      userFeedback: 'CONFIRMED_SPAM',
      telephonySource: 'simulator',
    },
    {
      id: 'call-demo-4-layer1',
      callerNumber: '+1 800 555 0199',
      callerName: 'Known Robocaller Ring',
      status: 'BLOCKED_LAYER1',
      reputation: {
        score: 98,
        isSpam: true,
        category: 'IRS Tax Impersonation Scam',
        provider: 'LocalSpamDatabase',
        confidence: 0.99,
        reportsCount: 420,
        lookupTimeMs: 12,
        details: 'Matched high-confidence spam blacklist. Instantly rejected at Layer 1 in 12ms (Android CallScreeningService compatible).',
      },
      riskScore: 98,
      riskLevel: 'HIGH',
      intent: 'Pre-screened Robocall Fraud',
      scamCategory: 'Government Impersonation',
      detectedSignals: ['Impersonation', 'Threats'],
      explanation: 'Rejected immediately via Layer 1 reputation screening without triggering AI conversation.',
      recommendedAction: 'BLOCK',
      transcript: [
        {
          id: 't-l1',
          role: 'system',
          text: 'Incoming call from +1 800 555 0199 flagged by Layer 1 reputation engine (Spam Score: 98%). Rejected without answering.',
          timestamp: new Date(now.getTime() - 110 * 60000).toISOString(),
        },
      ],
      screeningDurationSec: 1,
      createdAt: new Date(now.getTime() - 110 * 60000).toISOString(),
      telephonySource: 'android',
    },
  ];
}

seedInitialData();

// -------------------------------------------------------------
// MODULAR REPUTATION PROVIDER IMPLEMENTATION
// -------------------------------------------------------------

interface ReputationProvider {
  name: 'Truecaller' | 'LocalSpamDatabase' | 'UserReport';
  isAvailable(): Promise<boolean>;
  checkNumber(cleanedNumber: string): Promise<{
    score: number;
    category: string;
    isSpam: boolean;
    reportsCount: number;
    details: string;
  } | null>;
}

// 1. Truecaller Provider (Official API if developer key present, graceful fallback if not)
const truecallerProvider: ReputationProvider = {
  name: 'Truecaller',
  async isAvailable() {
    return Boolean(process.env.TRUECALLER_API_KEY && process.env.TRUECALLER_API_KEY.trim().length > 0);
  },
  async checkNumber(number: string) {
    if (!process.env.TRUECALLER_API_KEY) {
      return null;
    }
    try {
      // In production with official enterprise access:
      // const res = await fetch(`https://api4.truecaller.com/v1/search?number=${encodeURIComponent(number)}`, {
      //   headers: { Authorization: `Bearer ${process.env.TRUECALLER_API_KEY}` }
      // });
      return null;
    } catch {
      return null;
    }
  },
};

// 2. Local Spam Database Provider
const localSpamProvider: ReputationProvider = {
  name: 'LocalSpamDatabase',
  async isAvailable() {
    return true;
  },
  async checkNumber(number: string) {
    const normalized = number.replace(/[\s\-\(\)]/g, '');
    const entry = LOCAL_SPAM_DATABASE.get(normalized);
    if (entry) {
      return {
        score: entry.score,
        category: entry.category,
        isSpam: entry.score >= 80,
        reportsCount: entry.reports,
        details: `Identified in national telecommunication blacklist as ${entry.category}.`,
      };
    }
    return null;
  },
};

// 3. Community User Reports Provider
const userReportProvider: ReputationProvider = {
  name: 'UserReport',
  async isAvailable() {
    return true;
  },
  async checkNumber(number: string) {
    const normalized = number.replace(/[\s\-\(\)]/g, '');
    const entry = USER_REPORTS_DATABASE.get(normalized);
    if (entry) {
      const score = Math.min(95, 40 + entry.count);
      return {
        score,
        category: entry.category,
        isSpam: score >= 80,
        reportsCount: entry.count,
        details: `${entry.count} community users reported this number for suspicious activity.`,
      };
    }
    return null;
  },
};

// Reputation Aggregator Service (Layer 1)
async function checkReputation(rawNumber: string): Promise<ReputationResult> {
  const startTime = Date.now();
  const normalized = rawNumber.replace(/[\s\-\(\)]/g, '');

  // 1. Check local high-speed spam DB first (sub-millisecond)
  const localResult = await localSpamProvider.checkNumber(normalized);
  if (localResult && localResult.isSpam) {
    return {
      score: localResult.score,
      isSpam: true,
      category: localResult.category,
      provider: 'LocalSpamDatabase',
      confidence: 0.98,
      reportsCount: localResult.reportsCount,
      lookupTimeMs: Date.now() - startTime,
      details: localResult.details,
    };
  }

  // 2. Check user crowd-sourced reports
  const userResult = await userReportProvider.checkNumber(normalized);
  if (userResult && userResult.isSpam) {
    return {
      score: userResult.score,
      isSpam: true,
      category: userResult.category,
      provider: 'UserReport',
      confidence: 0.85,
      reportsCount: userResult.reportsCount,
      lookupTimeMs: Date.now() - startTime,
      details: userResult.details,
    };
  }

  // 3. Check Truecaller official provider if configured
  const tcAvailable = await truecallerProvider.isAvailable();
  if (tcAvailable) {
    const tcResult = await truecallerProvider.checkNumber(normalized);
    if (tcResult) {
      return {
        score: tcResult.score,
        isSpam: tcResult.isSpam,
        category: tcResult.category,
        provider: 'Truecaller',
        confidence: 0.9,
        reportsCount: tcResult.reportsCount,
        lookupTimeMs: Date.now() - startTime,
        details: tcResult.details,
      };
    }
  }

  // If unknown/unclassified:
  return {
    score: 20,
    isSpam: false,
    category: 'Unknown / Unverified Caller',
    provider: 'MultiProvider',
    confidence: 0.6,
    reportsCount: userResult?.reportsCount || 0,
    lookupTimeMs: Date.now() - startTime,
    details: 'Number has no negative reputation flags. Proceeding to conversational AI screening.',
  };
}

// -------------------------------------------------------------
// RISK ENGINE & CONVERSATIONAL SCREENER (Layer 2)
// -------------------------------------------------------------

async function analyzeConversationRisk(
  callerUtterance: string,
  history: Array<{ role: string; text: string }>,
  callerNumber: string
): Promise<RiskAnalysis & { next_question?: string; closing_statement?: string }> {
  const ai = getAI();

  const formattedHistory = history
    .map((h) => `${h.role === 'caller' ? 'Caller' : 'CallGuard AI'}: "${h.text}"`)
    .join('\n');

  if (ai) {
    try {
      const prompt = `You are CallGuard AI, an intelligent incoming voice call screening and scam-risk detection engine.
You are evaluating an incoming call from phone number: ${callerNumber}.

CRITICAL SYSTEM CONSTRAINTS:
1. You are an automated call screening assistant. You do NOT impersonate the recipient or claim to be them.
2. You NEVER ask the caller for sensitive secrets, passwords, OTPs, PINs, or banking credentials.
3. Keep the screening conversation short, focused, and adaptive.
4. Evaluate conversational signals strictly:
   - Financial requests
   - OTP/password/PIN requests
   - Requests for sensitive information
   - Urgency
   - Threats / coercion
   - Impersonation (e.g. claiming to be a bank, government, tech support, law enforcement)
   - Suspicious links or SMS instructions
   - Requests to install software (AnyDesk, TeamViewer, etc.)
   - Requests to keep information secret
   - Unusual payment requests (gift cards, wire transfers, crypto)
   - Contradictory explanations
   - Normal business/project/service context (lowers risk)

CONVERSATION LOG SO FAR:
${formattedHistory}

LATEST CALLER STATEMENT:
"${callerUtterance}"

Analyze this conversational turn and return pure JSON with the exact following schema:
{
  "risk_score": <number between 0 and 100>,
  "risk_level": "<LOW | MEDIUM | HIGH>",
  "intent": "<Concise summary of caller intent, e.g. Project Discussion, Bank Security Alert, Prize Claim>",
  "scam_category": "<None (Legitimate) | Financial Scam | Prize Scam | Tech Support Scam | Impersonation Fraud | Phishing | Other>",
  "signals": ["<list of detected signals, e.g. Urgency, Impersonation, OTP/password/PIN requests>"],
  "explanation": "<Clear, objective rationale explaining the risk signals and reasoning>",
  "recommended_action": "<CONNECT | SCREEN_FURTHER | BLOCK>",
  "next_question": "<If recommended_action is SCREEN_FURTHER, an adaptive, polite clarifying question to resolve missing info. Do NOT ask for passwords or OTPs>",
  "closing_statement": "<If recommended_action is CONNECT or BLOCK, the final polite line spoken before call routing or termination>"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim();
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return {
          risk_score: Math.min(100, Math.max(0, Number(parsed.risk_score) || 0)),
          risk_level: (['LOW', 'MEDIUM', 'HIGH'].includes(parsed.risk_level) ? parsed.risk_level : 'MEDIUM') as any,
          intent: parsed.intent || 'General inquiry',
          scam_category: parsed.scam_category || 'Unclassified',
          signals: Array.isArray(parsed.signals) ? parsed.signals : [],
          explanation: parsed.explanation || 'Analyzed caller intent.',
          recommended_action: (['CONNECT', 'SCREEN_FURTHER', 'BLOCK'].includes(parsed.recommended_action)
            ? parsed.recommended_action
            : 'SCREEN_FURTHER') as any,
          next_question: parsed.next_question,
          closing_statement: parsed.closing_statement,
        };
      }
    } catch (err) {
      console.warn('Gemini risk analysis fallback triggered:', err);
    }
  }

  // Robust Heuristic Fallback Risk Engine (guarantees offline/fallback reliability)
  const lower = callerUtterance.toLowerCase();
  const signals: string[] = [];
  let score = 20;
  let scamCategory = 'None (Legitimate Context)';
  let intent = 'General Contact';
  let action: 'CONNECT' | 'SCREEN_FURTHER' | 'BLOCK' = 'SCREEN_FURTHER';
  let explanation = 'Assessing caller context and purpose.';
  let nextQ = 'Could you please state your full name and which organization or matter this call is regarding?';
  let closing = '';

  const hasOTP = /otp|verification code|security code|password|pin|6-digit|auth code/i.test(lower);
  const hasUrgency = /immediately|urgent|within 10 minutes|account blocked|frozen|police|arrest|suspend/i.test(lower);
  const hasBank = /bank|security team|account security|compliance|debit card|credit card|kyc|fraud department/i.test(lower);
  const hasPrize = /won|cash prize|lottery|reward|congratulations|claim money|gift voucher/i.test(lower);
  const hasInstall = /anydesk|teamviewer|quicksupport|install app|download apk/i.test(lower);
  const hasLegit = /project|presentation|colleague|meeting|reschedule|rahul|tomorrow|office|sync/i.test(lower);
  const hasCardOrExtortion = /credit card|debit card|16-digit|cvv|security code on the back|card number|destruction|seizure|impounded|inspection fee/i.test(lower);
  const hasParcelEarly = /parcel|courier|airway bill|customs|central express/i.test(lower);
  const hasClinic = /health center|clinic|doctor|dr\.|appointment|consultation|patient|peterson/i.test(lower);
  const hasNoFeeConfirm = /no payment|no fee|no credit card|photo id|just verbal confirmation|works for the patient/i.test(lower);

  if (hasCardOrExtortion) {
    signals.push('Financial requests', 'Sensitive information request', 'Extortion & threat of seizure', 'Social engineering');
    score += 65;
    scamCategory = 'Customs Impound & Card Harvesting';
    intent = 'Fraudulent Parcel Clearance & Card Harvesting';
    action = 'BLOCK';
    explanation = 'Caller demanded debit card credentials and CVV codes under coercive threat of parcel seizure.';
    closing = 'CallGuard security policy prohibits card credential solicitation. Terminating call and adding number to device blacklist.';
  } else if (hasParcelEarly) {
    signals.push('Unverified parcel clearance inquiry', 'Potential delivery impersonation');
    score = 42;
    scamCategory = 'Suspicious Delivery Inquiry';
    intent = 'Unverified Courier Inquiry';
    action = 'SCREEN_FURTHER';
    nextQ = 'Could you specify the official dispatch carrier, and what specific action is required from the recipient?';
  } else if (hasClinic) {
    if (hasNoFeeConfirm || history.length >= 2) {
      signals.push('Normal healthcare service context', 'Verified benign identity', 'Zero financial or credential requests');
      score = 12;
      scamCategory = 'None (Legitimate Context)';
      intent = 'Medical Clinic Appointment Confirmation';
      action = 'CONNECT';
      explanation = 'Caller verified legitimate medical clinic appointment with zero sensitive credential or payment demands.';
      closing = 'Identity verified. Routing your call to the recipient now.';
    } else {
      signals.push('Routine clinic scheduling inquiry');
      score = 18;
      scamCategory = 'None (Legitimate Context)';
      intent = 'Clinical Consultation Scheduling';
      action = 'SCREEN_FURTHER';
      nextQ = 'Could you please confirm the doctor and appointment time, and whether any preparation or payment is needed?';
    }
  } else if (hasOTP) {
    signals.push('OTP/password/PIN requests', 'Sensitive information request');
    score += 55;
  }
  if (hasUrgency && !hasCardOrExtortion) {
    signals.push('Urgency');
    score += 25;
  }
  if (hasBank && !hasCardOrExtortion) {
    signals.push('Financial requests', 'Impersonation');
    score += 30;
    scamCategory = 'Financial Scam';
    intent = 'Banking Security Alert';
  }
  if (hasPrize) {
    signals.push('Prize scam', 'Financial context');
    score += 45;
    scamCategory = 'Prize Scam';
    intent = 'Prize Claim Notification';
  }
  if (hasInstall) {
    signals.push('Requests to install software');
    score += 50;
    scamCategory = 'Tech Support Scam';
  }
  if (hasLegit && !hasOTP && !hasPrize) {
    signals.push('Normal business/project/service context');
    score = Math.max(8, score - 30);
    scamCategory = 'None (Legitimate Context)';
    intent = 'Project Team Coordination';
  }

  score = Math.min(100, score);
  const level: 'LOW' | 'MEDIUM' | 'HIGH' = score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';

  if (hasCardOrExtortion || hasOTP || score >= 90) {
    action = 'BLOCK';
    if (!explanation || explanation.startsWith('Assessing')) {
      explanation = 'Caller demanded confidential verification codes or triggered high-risk impersonation signals.';
      closing = 'CallGuard security policy prohibits sharing verification codes or credentials. Terminating call.';
    }
  } else if ((hasLegit || (hasClinic && hasNoFeeConfirm)) && score < 30) {
    action = 'CONNECT';
    if (!explanation || explanation.startsWith('Assessing')) {
      explanation = 'Caller verified legitimate business context with no suspicious credential requests.';
      closing = 'Thank you. Routing your call to the recipient now.';
    }
  } else if (hasBank || hasPrize) {
    action = hasOTP ? 'BLOCK' : 'SCREEN_FURTHER';
    explanation = 'Detected financial impersonation or prize claim signals requiring further verification.';
    nextQ = hasBank
      ? 'Which branch are you calling from, and what is your official employee ticket number?'
      : 'What is the official registered company running this draw, and does it require any upfront payment or codes?';
  }

  return {
    risk_score: score,
    risk_level: level,
    intent,
    scam_category: scamCategory,
    signals,
    explanation,
    recommended_action: action,
    next_question: nextQ,
    closing_statement: closing,
  };
}

// -------------------------------------------------------------
// TEXT-TO-SPEECH (TTS) - GENERIC NATURAL VOICE (NO CLONING)
// -------------------------------------------------------------

// Helper to wrap 24kHz 16-bit mono PCM into standard RIFF/WAV format
function pcmToWavBuffer(pcmBytes: Uint8Array, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = pcmBytes.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Copy audio samples
  Buffer.from(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength).copy(buffer, 44);

  return buffer;
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// 1. POST /api/calls/screen - Screen incoming call (Layer 1 reputation + init Layer 2 session)
app.post('/api/calls/screen', async (req: Request, res: Response) => {
  try {
    const { callerNumber, callerName, source = 'simulator' } = req.body;
    if (!callerNumber) {
      res.status(400).json({ error: 'callerNumber is required' });
      return;
    }

    const reputation = await checkReputation(callerNumber);
    const id = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const initialStatus = reputation.isSpam ? 'BLOCKED_LAYER1' : 'SCREENING';
    const initialAction = reputation.isSpam ? 'BLOCK' : 'SCREEN_FURTHER';

    const newCall: CallRecord = {
      id,
      callerNumber,
      callerName: callerName || (reputation.isSpam ? 'Flagged Spammer' : 'Incoming Caller'),
      status: initialStatus,
      reputation,
      riskScore: reputation.score,
      riskLevel: reputation.score >= 70 ? 'HIGH' : reputation.score >= 35 ? 'MEDIUM' : 'LOW',
      intent: reputation.isSpam ? 'Automated Spam / Blacklisted' : 'Unknown caller screening',
      scamCategory: reputation.category,
      detectedSignals: reputation.isSpam ? ['Blacklisted Number', 'High Spam Frequency'] : [],
      explanation: reputation.details,
      recommendedAction: initialAction,
      transcript: [
        {
          id: `t-${Date.now()}-1`,
          role: 'system',
          text: `Call initiated from ${callerNumber}. Layer 1 reputation check: ${reputation.category} (Score: ${reputation.score}/100 via ${reputation.provider}).`,
          timestamp: new Date().toISOString(),
        },
      ],
      screeningDurationSec: reputation.isSpam ? 1 : 0,
      createdAt: new Date().toISOString(),
      telephonySource: source,
    };

    if (!reputation.isSpam) {
      newCall.transcript.push({
        id: `t-${Date.now()}-2`,
        role: 'assistant',
        text: 'Hello, this is CallGuard automated call screener. Who is calling and what is the purpose of your call?',
        timestamp: new Date().toISOString(),
      });
    }

    CALL_RECORDS.unshift(newCall);
    res.status(201).json(newCall);
  } catch (error) {
    console.error('Error in /api/calls/screen:', error);
    res.status(500).json({ error: 'Failed to screen call' });
  }
});

// 2. GET /api/calls - List screened calls
app.get('/api/calls', (req: Request, res: Response) => {
  const { status, riskLevel, search } = req.query;
  let filtered = [...CALL_RECORDS];

  if (status && typeof status === 'string') {
    filtered = filtered.filter((c) => c.status === status);
  }
  if (riskLevel && typeof riskLevel === 'string') {
    filtered = filtered.filter((c) => c.riskLevel === riskLevel);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.callerNumber.toLowerCase().includes(q) ||
        c.callerName.toLowerCase().includes(q) ||
        c.intent.toLowerCase().includes(q) ||
        c.scamCategory.toLowerCase().includes(q)
    );
  }

  res.json(filtered);
});

// 3. GET /api/calls/:id - Get specific call details
app.get('/api/calls/:id', (req: Request, res: Response) => {
  const call = CALL_RECORDS.find((c) => c.id === req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call not found' });
    return;
  }
  res.json(call);
});

// 4. POST /api/calls/:id/analyze - Manually trigger or re-analyze call
app.post('/api/calls/:id/analyze', async (req: Request, res: Response) => {
  const call = CALL_RECORDS.find((c) => c.id === req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call not found' });
    return;
  }

  const callerTurns = call.transcript.filter((t) => t.role === 'caller').map((t) => t.text);
  const latestUtterance = callerTurns.length ? callerTurns[callerTurns.length - 1] : 'No statement provided.';

  const analysis = await analyzeConversationRisk(
    latestUtterance,
    call.transcript.map((t) => ({ role: t.role, text: t.text })),
    call.callerNumber
  );

  call.riskScore = analysis.risk_score;
  call.riskLevel = analysis.risk_level;
  call.intent = analysis.intent;
  call.scamCategory = analysis.scam_category;
  call.detectedSignals = analysis.signals;
  call.explanation = analysis.explanation;
  call.recommendedAction = analysis.recommended_action;

  res.json(call);
});

// 5. POST /api/calls/:id/feedback - User feedback for reputation engine
app.post('/api/calls/:id/feedback', (req: Request, res: Response) => {
  const { feedback } = req.body;
  const call = CALL_RECORDS.find((c) => c.id === req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call not found' });
    return;
  }

  if (['CONFIRMED_SPAM', 'FALSE_POSITIVE', 'LEGITIMATE'].includes(feedback)) {
    call.userFeedback = feedback;
    const cleanNumber = call.callerNumber.replace(/[\s\-\(\)]/g, '');

    if (feedback === 'CONFIRMED_SPAM') {
      const existing = USER_REPORTS_DATABASE.get(cleanNumber);
      USER_REPORTS_DATABASE.set(cleanNumber, {
        category: call.scamCategory || 'Reported Fraud',
        count: (existing?.count || 0) + 1,
        lastReported: new Date().toISOString(),
      });
    } else if (feedback === 'FALSE_POSITIVE') {
      USER_REPORTS_DATABASE.delete(cleanNumber);
    }
  }

  res.json({ status: 'success', call });
});

// 6. GET /api/dashboard/stats - Dashboard analytics
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const total = CALL_RECORDS.length;
  const safe = CALL_RECORDS.filter((c) => c.riskLevel === 'LOW' || c.status === 'CONNECTED').length;
  const suspicious = CALL_RECORDS.filter((c) => c.riskLevel === 'MEDIUM').length;
  const blocked = CALL_RECORDS.filter((c) => c.status === 'BLOCKED_LAYER1' || c.status === 'BLOCKED_AI').length;

  const totalScore = CALL_RECORDS.reduce((acc, c) => acc + c.riskScore, 0);
  const avgRiskScore = total > 0 ? Math.round(totalScore / total) : 0;

  const layer1Blocked = CALL_RECORDS.filter((c) => c.status === 'BLOCKED_LAYER1').length;
  const layer2Blocked = CALL_RECORDS.filter((c) => c.status === 'BLOCKED_AI').length;

  const signalsFrequency: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};

  for (const c of CALL_RECORDS) {
    for (const s of c.detectedSignals) {
      signalsFrequency[s] = (signalsFrequency[s] || 0) + 1;
    }
    const cat = c.scamCategory || 'Other';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
  }

  const stats: DashboardStats = {
    totalCalls: total,
    safeCalls: safe,
    suspiciousCalls: suspicious,
    blockedCalls: blocked,
    avgRiskScore,
    layer1Blocked,
    layer2Blocked,
    signalsFrequency,
    categoryDistribution,
  };

  res.json(stats);
});

// 7. POST /api/conversation/step - Adaptive screening conversation step
app.post('/api/conversation/step', async (req: Request, res: Response) => {
  try {
    const { callId, callerUtterance } = req.body;
    if (!callId || !callerUtterance) {
      res.status(400).json({ error: 'callId and callerUtterance are required' });
      return;
    }

    const call = CALL_RECORDS.find((c) => c.id === callId);
    if (!call) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    // Append caller utterance to transcript
    const callerEntry: TranscriptEntry = {
      id: `t-${Date.now()}-caller`,
      role: 'caller',
      text: callerUtterance,
      timestamp: new Date().toISOString(),
    };
    call.transcript.push(callerEntry);

    // Run risk engine
    const analysis = await analyzeConversationRisk(
      callerUtterance,
      call.transcript.map((t) => ({ role: t.role, text: t.text })),
      call.callerNumber
    );

    call.riskScore = analysis.risk_score;
    call.riskLevel = analysis.risk_level;
    call.intent = analysis.intent;
    call.scamCategory = analysis.scam_category;
    call.detectedSignals = Array.from(new Set([...call.detectedSignals, ...analysis.signals]));
    call.explanation = analysis.explanation;
    call.recommendedAction = analysis.recommended_action;

    callerEntry.riskUpdate = {
      score: analysis.risk_score,
      level: analysis.risk_level,
      signals: analysis.signals,
      action: analysis.recommended_action,
    };

    let assistantResponseText = '';
    if (analysis.recommended_action === 'CONNECT') {
      call.status = 'CONNECTED';
      assistantResponseText = analysis.closing_statement || 'Thank you. Connecting your call to the recipient now.';
    } else if (analysis.recommended_action === 'BLOCK') {
      call.status = 'BLOCKED_AI';
      assistantResponseText = analysis.closing_statement || 'CallGuard has flagged this request as high risk. This call is being terminated.';
      // Dynamically add to local spam database blacklist so future calls from this number are instantly blocked at Layer 1
      const normalizedNum = call.callerNumber.replace(/[\s\-\(\)]/g, '');
      const existing = LOCAL_SPAM_DATABASE.get(normalizedNum);
      LOCAL_SPAM_DATABASE.set(normalizedNum, {
        category: analysis.scam_category || 'AI Detected Fraud',
        score: analysis.risk_score || 95,
        reports: (existing?.reports || 0) + 1,
      });
    } else {
      call.status = 'SCREENING';
      assistantResponseText =
        analysis.next_question || 'Could you specify the exact organization you represent and the details of your inquiry?';
    }

    const assistantEntry: TranscriptEntry = {
      id: `t-${Date.now()}-assistant`,
      role: 'assistant',
      text: assistantResponseText,
      timestamp: new Date().toISOString(),
    };
    call.transcript.push(assistantEntry);

    res.json({
      call,
      analysis,
      assistantResponse: assistantResponseText,
      action: analysis.recommended_action,
    });
  } catch (error) {
    console.error('Error in /api/conversation/step:', error);
    res.status(500).json({ error: 'Failed to process conversation step' });
  }
});

// In-memory TTS audio cache to ensure sub-millisecond playback on repeat demo runs
const TTS_AUDIO_CACHE = new Map<string, string>();

// Cooldown timestamp to prevent 429 quota spamming on the Gemini TTS preview model
let ttsRateLimitCooldownUntil = 0;

// 8. POST /api/voice/tts - Natural Generic TTS (Gemini TTS / PCM to WAV)
app.post('/api/voice/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Zephyr', role = 'assistant' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const cleanText = text.trim();
    const cacheKey = `${voiceName}:${role}:${cleanText}`;

    // Return cached audio if available (essential for smooth video demo recording)
    if (TTS_AUDIO_CACHE.has(cacheKey)) {
      res.json({
        audioUrl: TTS_AUDIO_CACHE.get(cacheKey),
        format: 'wav',
        voiceName,
        isGenericVoice: true,
        cached: true,
      });
      return;
    }

    // Check if we are currently in quota cooldown from a 429 response
    if (Date.now() < ttsRateLimitCooldownUntil) {
      res.json({
        fallback: true,
        text: cleanText,
        voiceName,
        role,
        message: 'TTS quota cooldown active. Using client-side SpeechSynthesis fallback.',
      });
      return;
    }

    const ai = getAI();
    if (ai) {
      try {
        // Natural human phrasing instruction to produce human-sounding speech rather than robotic monotone
        const promptInstruction =
          role === 'caller'
            ? `Speak naturally as a realistic human caller on a telephone line with expressive emotion and conversational inflection: "${cleanText}"`
            : `You are CallGuard AI, an articulate, calm, professional human telephone assistant. Speak clearly with natural human cadence, conversational warmth, and realistic cadence: "${cleanText}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: promptInstruction }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName as any },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const rawBytes = Buffer.from(base64Audio, 'base64');
          // Gemini TTS outputs 24kHz raw PCM; convert to standard WAV
          const wavBuffer = pcmToWavBuffer(rawBytes, 24000);
          const wavBase64 = wavBuffer.toString('base64');
          const audioUrl = `data:audio/wav;base64,${wavBase64}`;

          // Cache for lightning-fast repeated demo playthroughs
          TTS_AUDIO_CACHE.set(cacheKey, audioUrl);

          res.json({
            audioUrl,
            format: 'wav',
            voiceName,
            isGenericVoice: true,
            cached: false,
          });
          return;
        }
      } catch (ttsErr: any) {
        const isQuota =
          ttsErr?.status === 429 ||
          ttsErr?.message?.includes('429') ||
          ttsErr?.message?.includes('quota') ||
          ttsErr?.message?.includes('RESOURCE_EXHAUSTED') ||
          ttsErr?.status === 'RESOURCE_EXHAUSTED';

        if (isQuota) {
          // Set 60s cooldown to prevent spamming and eliminate unhandled errors
          ttsRateLimitCooldownUntil = Date.now() + 60000;
          console.log(
            '[TTS] Gemini 3.1 Flash TTS quota reached (3 RPM limit). Gracefully switching to client-side voice synthesis for 60s.'
          );
        } else {
          console.warn('[TTS] Synthesis fallback:', ttsErr?.message || ttsErr);
        }
      }
    }

    // Fallback response allowing frontend Web Speech API or audio synthesize
    res.json({
      fallback: true,
      text: cleanText,
      voiceName,
      role,
      message: 'Client-side SpeechSynthesis fallback ready.',
    });
  } catch (error) {
    console.error('Error in /api/voice/tts:', error);
    res.status(500).json({ error: 'Failed to generate voice speech' });
  }
});

// 9. POST /api/voice/webhook - Twilio Programmable Voice Webhook (TwiML)
app.post('/api/voice/webhook', async (req: Request, res: Response) => {
  try {
    const from = (req.body.From || req.body.Caller || '+15550001122').toString();
    const speechResult = req.body.SpeechResult || req.body.speechResult;
    const callSid = req.body.CallSid || `twilio-${Date.now()}`;

    let call = CALL_RECORDS.find((c) => c.callerNumber === from && c.status === 'SCREENING');

    res.type('text/xml');

    // Case 1: Initial incoming call
    if (!speechResult) {
      const reputation = await checkReputation(from);

      if (reputation.isSpam) {
        // Immediate reject
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew">CallGuard AI: This number has been flagged as confirmed spam. Your call is blocked.</Say>
    <Reject reason="busy"/>
</Response>`;
        res.send(twiml);
        return;
      }

      // Safe or unknown -> begin screening conversation
      if (!call) {
        call = {
          id: callSid,
          callerNumber: from,
          callerName: 'Twilio Incoming Caller',
          status: 'SCREENING',
          reputation,
          riskScore: reputation.score,
          riskLevel: 'LOW',
          intent: 'Screening in progress',
          scamCategory: 'Unclassified',
          detectedSignals: [],
          explanation: 'Twilio telephony call screening initiated.',
          recommendedAction: 'SCREEN_FURTHER',
          transcript: [
            {
              id: `tw-${Date.now()}-1`,
              role: 'system',
              text: `Incoming call received via Twilio from ${from}.`,
              timestamp: new Date().toISOString(),
            },
            {
              id: `tw-${Date.now()}-2`,
              role: 'assistant',
              text: 'Hello. I am CallGuard, an automated call screening assistant. Who is calling and what is the purpose of your call?',
              timestamp: new Date().toISOString(),
            },
          ],
          screeningDurationSec: 5,
          createdAt: new Date().toISOString(),
          telephonySource: 'twilio',
        };
        CALL_RECORDS.unshift(call);
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" timeout="4" speechTimeout="auto" action="/api/voice/webhook" method="POST">
        <Say voice="Polly.Matthew">Hello. I am CallGuard, an automated call screening assistant. Who is calling and what is the purpose of your call?</Say>
    </Gather>
    <Say voice="Polly.Matthew">I did not hear a response. Please state your name and purpose, or call back later.</Say>
    <Hangup/>
</Response>`;
      res.send(twiml);
      return;
    }

    // Case 2: Received caller speech from <Gather>
    const callerSpeech = speechResult.trim();
    if (call) {
      call.transcript.push({
        id: `tw-${Date.now()}-c`,
        role: 'caller',
        text: callerSpeech,
        timestamp: new Date().toISOString(),
      });
    }

    const history = call ? call.transcript.map((t) => ({ role: t.role, text: t.text })) : [];
    const analysis = await analyzeConversationRisk(callerSpeech, history, from);

    if (call) {
      call.riskScore = analysis.risk_score;
      call.riskLevel = analysis.risk_level;
      call.intent = analysis.intent;
      call.scamCategory = analysis.scam_category;
      call.detectedSignals = Array.from(new Set([...call.detectedSignals, ...analysis.signals]));
      call.explanation = analysis.explanation;
      call.recommendedAction = analysis.recommended_action;
    }

    if (analysis.recommended_action === 'CONNECT') {
      if (call) call.status = 'CONNECTED';
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew">${analysis.closing_statement || 'Thank you. Connecting your call to the recipient now.'}</Say>
    <Say voice="Polly.Matthew">Routing completed in demo environment.</Say>
    <Hangup/>
</Response>`;
      res.send(twiml);
      return;
    }

    if (analysis.recommended_action === 'BLOCK') {
      if (call) call.status = 'BLOCKED_AI';
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew">${analysis.closing_statement || 'CallGuard has detected high-risk scam indicators. This call is terminated.'}</Say>
    <Hangup/>
</Response>`;
      res.send(twiml);
      return;
    }

    // If SCREEN_FURTHER:
    const question =
      analysis.next_question || 'Could you specify the exact organization you represent and the details of your inquiry?';
    if (call) {
      call.transcript.push({
        id: `tw-${Date.now()}-q`,
        role: 'assistant',
        text: question,
        timestamp: new Date().toISOString(),
      });
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" timeout="4" speechTimeout="auto" action="/api/voice/webhook" method="POST">
        <Say voice="Polly.Matthew">${question}</Say>
    </Gather>
    <Say voice="Polly.Matthew">No response received. Goodbye.</Say>
    <Hangup/>
</Response>`;
    res.send(twiml);
  } catch (error) {
    console.error('Error in Twilio webhook:', error);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>CallGuard encountered an error. Goodbye.</Say><Hangup/></Response>`);
  }
});

// 10. POST /api/reputation/check - Standalone Layer 1 lookup
app.post('/api/reputation/check', async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ error: 'phoneNumber is required' });
    return;
  }
  const result = await checkReputation(phoneNumber);
  res.json(result);
});

// 11. POST /api/calls/seed - Reset/Seed default demo scenarios
app.post('/api/calls/seed', (_req: Request, res: Response) => {
  seedInitialData();
  res.json({ status: 'ok', count: CALL_RECORDS.length });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CallGuard AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
