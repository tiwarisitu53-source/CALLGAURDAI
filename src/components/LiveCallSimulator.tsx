import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Play,
  Pause,
  SkipForward,
  Video,
  FileText,
  Sliders,
  Bell,
  Gauge,
  Zap,
} from 'lucide-react';
import { CallRecord, RecommendedAction, RiskLevel } from '../types';
import { DEMO_SCENARIOS } from '../data/demoScenarios';
import {
  speakVoice,
  stopAudioPlayback,
  playRingTone,
  playPickupClick,
  playHangupTone,
  playThreatAlertPing,
  playConnectChime,
  preloadDemoPhrases,
} from '../utils/audio';
import { AudioWaveform } from './AudioWaveform';

interface Props {
  onCallCompleted: () => void;
  onSelectCallForDetails: (call: CallRecord) => void;
}

export type DemoStep =
  | 'IDLE'
  | 'RINGING'
  | 'AI_GREETING'
  | 'CALLER_TURN_1'
  | 'ANALYZING_1'
  | 'AI_FOLLOWUP'
  | 'CALLER_TURN_2'
  | 'ANALYZING_2'
  | 'CALLER_TURN_3'
  | 'ANALYZING_3'
  | 'MITIGATION'
  | 'COMPLETED';

export const LiveCallSimulator: React.FC<Props> = ({ onCallCompleted, onSelectCallForDetails }) => {
  // Mode selection: 'AUTO_DEMO' (for demo video recording) or 'MANUAL' (for typing/speaking)
  const [simulatorMode, setSimulatorMode] = useState<'AUTO_DEMO' | 'MANUAL'>('AUTO_DEMO');

  // Scenario Selection
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scenario-2');
  const [customNumber, setCustomNumber] = useState<string>('+91 98765 43210');
  const [customName, setCustomName] = useState<string>('Fraud Security Desk');
  const [callerUtterance, setCallerUtterance] = useState<string>(
    DEMO_SCENARIOS[1]?.callerOpening || "I'm calling from your bank. Your account has a security issue."
  );

  // Active Call State
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'SCREENING' | 'DECIDED'>('IDLE');
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);

  // Auto-Play Demo Video State Machine
  const [demoStep, setDemoStep] = useState<DemoStep>('IDLE');
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activeSpeaker, setActiveSpeaker] = useState<'none' | 'assistant' | 'caller'>('none');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to record video demo');
  const [callTimerSec, setCallTimerSec] = useState<number>(0);

  // Helper to format MM:SS
  const formatCallDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Voice & Audio Configuration
  const [aiVoice, setAiVoice] = useState<'Zephyr' | 'Kore' | 'Charon' | 'Fenrir'>('Zephyr');
  const [callerVoice, setCallerVoice] = useState<'Puck' | 'Fenrir' | 'MUTE'>('Puck');
  const [soundFxEnabled, setSoundFxEnabled] = useState<boolean>(true);
  const [showPresenterScript, setShowPresenterScript] = useState<boolean>(false);

  // Speech to text manual input
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoPlayAbortedRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Sync ref with paused state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Active call duration timer
  useEffect(() => {
    let interval: any = null;
    if (
      (callState === 'SCREENING' || callState === 'RINGING' || callState === 'DECIDED') &&
      isAutoPlaying &&
      !isPaused
    ) {
      interval = setInterval(() => {
        setCallTimerSec((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState, isAutoPlaying, isPaused]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCall?.transcript]);

  // Handle scenario selection
  const handleSelectScenario = (scenarioId: string) => {
    if (callState !== 'IDLE' || isAutoPlaying) return;
    setSelectedScenarioId(scenarioId);
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      setCustomNumber(scenario.callerNumber);
      setCustomName(scenario.callerName);
      setCallerUtterance(scenario.callerOpening);
    }
  };

  // Helper to pause execution with pause check
  const delay = useCallback(
    (ms: number) => {
      const adjustedMs = ms / playbackSpeed;
      return new Promise<void>((resolve) => {
        const startTime = Date.now();
        const check = () => {
          if (autoPlayAbortedRef.current) {
            resolve();
            return;
          }
          if (isPausedRef.current) {
            setTimeout(check, 100);
            return;
          }
          if (Date.now() - startTime >= adjustedMs) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    },
    [playbackSpeed]
  );

  // -----------------------------------------------------------------
  // AUTO-PLAY DEMO RUN FOR VIDEO RECORDING
  // -----------------------------------------------------------------

  const handleStartAutoDemo = async () => {
    stopAudioPlayback();
    autoPlayAbortedRef.current = false;
    setIsAutoPlaying(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setCallState('RINGING');
    setDemoStep('RINGING');
    setCallTimerSec(0);

    const scenario = DEMO_SCENARIOS.find((s) => s.id === selectedScenarioId) || DEMO_SCENARIOS[1];
    const isExtended = Boolean(scenario.isExtendedScreening && scenario.turns && scenario.turns.length > 0);

    setStatusMessage(
      isExtended
        ? '1/6: Incoming Telephone Ring from Unregistered Unknown Caller...'
        : '1/5: Incoming Telephone Ring & Layer 1 Blacklist Check...'
    );

    try {
      // Step 1: Telephone Ringing sound
      if (soundFxEnabled) {
        await playRingTone(2.2);
      } else {
        await delay(1200);
      }

      if (autoPlayAbortedRef.current) return;

      if (soundFxEnabled) {
        playPickupClick();
      }

      // Layer 1 screening request
      const screenRes = await fetch('/api/calls/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerNumber: scenario.callerNumber,
          callerName: scenario.callerName,
          source: 'simulator',
        }),
      });

      if (!screenRes.ok) throw new Error('Screening endpoint failed');
      const callData: CallRecord = await screenRes.json();
      setActiveCall(callData);

      // Check if Layer 1 instantly blocked (Scenario 4)
      if (callData.status === 'BLOCKED_LAYER1') {
        setCallState('DECIDED');
        setDemoStep('MITIGATION');
        setStatusMessage('Instant Blacklist Match: Blocked at Layer 1 in <15ms');
        if (soundFxEnabled) playThreatAlertPing();

        setActiveSpeaker('assistant');
        await speakVoice(
          'CallGuard security alert: This number is flagged on the confirmed spam blacklist. Call rejected at Layer 1.',
          { role: 'assistant', voiceName: aiVoice, playbackRate: playbackSpeed }
        );
        setActiveSpeaker('none');

        if (soundFxEnabled) playHangupTone();
        setDemoStep('COMPLETED');
        setIsAutoPlaying(false);
        onCallCompleted();
        return;
      }

      // Step 2: CallGuard AI Voice Greeting
      setCallState('SCREENING');
      setDemoStep('AI_GREETING');
      setStatusMessage(
        isExtended
          ? '2/6: AI Answers Neutrally • Initiating Multi-turn Deep Screening...'
          : '2/5: CallGuard Voice Screening Initiated...'
      );
      setActiveSpeaker('assistant');

      const greetingText =
        'Hello, this is CallGuard automated call screener. Who is calling and what is the purpose of your call?';
      await speakVoice(greetingText, {
        role: 'assistant',
        voiceName: aiVoice,
        playbackRate: playbackSpeed,
      });
      setActiveSpeaker('none');

      if (autoPlayAbortedRef.current) return;
      await delay(700);

      // -----------------------------------------------------------------
      // BRANCH A: EXTENDED 60-90s SCREENING (Multi-Turn Deep Analysis)
      // -----------------------------------------------------------------
      if (isExtended && scenario.turns) {
        for (let i = 0; i < scenario.turns.length; i++) {
          if (autoPlayAbortedRef.current) return;
          const turn = scenario.turns[i];
          const isLastTurn = i === scenario.turns.length - 1;

          // Sync timer with conversation progress
          setCallTimerSec(turn.elapsedSec);

          const turnStepKey: DemoStep = i === 0 ? 'CALLER_TURN_1' : i === 1 ? 'CALLER_TURN_2' : 'CALLER_TURN_3';
          setDemoStep(turnStepKey);
          setStatusMessage(`Turn ${i + 1}/3 (${formatCallDuration(turn.elapsedSec)}): ${turn.stageName}`);
          setActiveSpeaker('caller');

          if (callerVoice !== 'MUTE') {
            await speakVoice(turn.callerSpeech, {
              role: 'caller',
              voiceName: callerVoice as any,
              playbackRate: playbackSpeed,
            });
          } else {
            await delay(2200);
          }
          setActiveSpeaker('none');

          if (autoPlayAbortedRef.current) return;

          const analyzingKey: DemoStep = i === 0 ? 'ANALYZING_1' : i === 1 ? 'ANALYZING_2' : 'ANALYZING_3';
          setDemoStep(analyzingKey);
          setStatusMessage(
            isLastTurn
              ? 'Final 60–90s Synthesis: Synthesizing Multi-turn Context & Threat Radar...'
              : `Analyzing Turn ${i + 1}: Updating Intent & Behavioral Radar...`
          );
          setIsProcessingTurn(true);

          const stepRes = await fetch('/api/conversation/step', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: callData.id,
              callerUtterance: turn.callerSpeech,
            }),
          });

          setIsProcessingTurn(false);
          if (!stepRes.ok) throw new Error(`Turn ${i + 1} analysis failed`);
          const stepData = await stepRes.json();
          setActiveCall(stepData.call);

          if (autoPlayAbortedRef.current) return;
          await delay(600);

          // If this is the final turn OR if a conclusive decision is reached
          if (isLastTurn || stepData.action === 'CONNECT' || stepData.action === 'BLOCK') {
            setCallState('DECIDED');
            setDemoStep('MITIGATION');

            if (stepData.action === 'BLOCK') {
              setStatusMessage(
                `6/6: High-Risk Extortion Detected (${stepData.call.riskScore}/100) → Autonomous Block & Blacklist`
              );
              if (soundFxEnabled) playThreatAlertPing();

              setActiveSpeaker('assistant');
              await speakVoice(stepData.assistantResponse, {
                role: 'assistant',
                voiceName: aiVoice,
                playbackRate: playbackSpeed,
              });
              setActiveSpeaker('none');

              if (soundFxEnabled) playHangupTone();
            } else {
              setStatusMessage(
                `6/6: Identity Verified (${stepData.call.riskScore}/100 LOW RISK) → Connecting Call to Recipient`
              );
              if (soundFxEnabled) playConnectChime();

              setActiveSpeaker('assistant');
              await speakVoice(stepData.assistantResponse, {
                role: 'assistant',
                voiceName: aiVoice,
                playbackRate: playbackSpeed,
              });
              setActiveSpeaker('none');
            }

            setDemoStep('COMPLETED');
            setStatusMessage(
              stepData.action === 'BLOCK'
                ? '60–90s Analysis Completed: Number blocked & added to device blacklist'
                : '60–90s Analysis Completed: Legitimate caller verified & connected'
            );
            setIsAutoPlaying(false);
            onCallCompleted();
            return;
          }

          // Otherwise, AI speaks the clarifying question before next turn
          setDemoStep('AI_FOLLOWUP');
          setStatusMessage(`AI Follow-up Question Spoken: "${stepData.assistantResponse}"`);
          setActiveSpeaker('assistant');

          await speakVoice(stepData.assistantResponse, {
            role: 'assistant',
            voiceName: aiVoice,
            playbackRate: playbackSpeed,
          });
          setActiveSpeaker('none');

          if (autoPlayAbortedRef.current) return;
          await delay(800);
        }
      }

      // -----------------------------------------------------------------
      // BRANCH B: STANDARD DEMO FLOW (Scenarios 1, 2, 3)
      // -----------------------------------------------------------------
      // Step 3: Caller Statement (Turn 1)
      setDemoStep('CALLER_TURN_1');
      setStatusMessage(`3/5: Caller Speaking: "${scenario.callerOpening}"`);
      setActiveSpeaker('caller');

      if (callerVoice !== 'MUTE') {
        await speakVoice(scenario.callerOpening, {
          role: 'caller',
          voiceName: callerVoice as any,
          playbackRate: playbackSpeed,
        });
      } else {
        await delay(2000);
      }
      setActiveSpeaker('none');

      if (autoPlayAbortedRef.current) return;

      // Analyze Turn 1
      setDemoStep('ANALYZING_1');
      setStatusMessage('Extracting Intent, Signals & Real-time Risk Metric...');
      setIsProcessingTurn(true);

      const step1Res = await fetch('/api/conversation/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callData.id,
          callerUtterance: scenario.callerOpening,
        }),
      });

      setIsProcessingTurn(false);
      if (!step1Res.ok) throw new Error('Turn 1 analysis failed');
      const step1Data = await step1Res.json();
      setActiveCall(step1Data.call);

      if (autoPlayAbortedRef.current) return;
      await delay(600);

      // If decided on first turn (e.g. Legitimate call connected, or direct scam)
      if (step1Data.action === 'CONNECT' || step1Data.action === 'BLOCK') {
        setCallState('DECIDED');
        setDemoStep('MITIGATION');
        setStatusMessage(
          step1Data.action === 'CONNECT'
            ? 'Action: Safe Identity Verified → Connecting Call to Recipient'
            : 'Action: High Risk Fraud Detected → Autonomous Call Termination'
        );

        if (step1Data.action === 'BLOCK' && soundFxEnabled) {
          playThreatAlertPing();
        } else if (step1Data.action === 'CONNECT' && soundFxEnabled) {
          playConnectChime();
        }

        setActiveSpeaker('assistant');
        await speakVoice(step1Data.assistantResponse, {
          role: 'assistant',
          voiceName: aiVoice,
          playbackRate: playbackSpeed,
        });
        setActiveSpeaker('none');

        if (step1Data.action === 'BLOCK' && soundFxEnabled) {
          playHangupTone();
        }

        setDemoStep('COMPLETED');
        setIsAutoPlaying(false);
        onCallCompleted();
        return;
      }

      // Step 4: Multi-turn Follow-up (e.g. Scenario 2 Bank Scam asking for details)
      setDemoStep('AI_FOLLOWUP');
      setStatusMessage('4/5: AI Clarifying Question Spoken...');
      setActiveSpeaker('assistant');

      await speakVoice(step1Data.assistantResponse, {
        role: 'assistant',
        voiceName: aiVoice,
        playbackRate: playbackSpeed,
      });
      setActiveSpeaker('none');

      if (autoPlayAbortedRef.current) return;
      await delay(700);

      // Caller Escalation (Turn 2 - e.g. Demand OTP)
      const followUpText =
        scenario.followUpCallerResponse ||
        'We just sent a 6-digit verification code to your phone. Tell me the OTP immediately or your account will be frozen.';

      setDemoStep('CALLER_TURN_2');
      setStatusMessage(`Caller Escalating Demands: "${followUpText}"`);
      setActiveSpeaker('caller');

      if (callerVoice !== 'MUTE') {
        await speakVoice(followUpText, {
          role: 'caller',
          voiceName: callerVoice as any,
          playbackRate: playbackSpeed,
        });
      } else {
        await delay(2500);
      }
      setActiveSpeaker('none');

      if (autoPlayAbortedRef.current) return;

      // Analyze Turn 2 (Catches OTP / Fraud demand)
      setDemoStep('ANALYZING_2');
      setStatusMessage('Risk Engine: High-Risk OTP Harvest Signal Triggered...');
      setIsProcessingTurn(true);

      const step2Res = await fetch('/api/conversation/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callData.id,
          callerUtterance: followUpText,
        }),
      });

      setIsProcessingTurn(false);
      if (!step2Res.ok) throw new Error('Turn 2 analysis failed');
      const step2Data = await step2Res.json();
      setActiveCall(step2Data.call);

      if (autoPlayAbortedRef.current) return;
      await delay(500);

      // Step 5: Threat Mitigation / Block Statement
      setCallState('DECIDED');
      setDemoStep('MITIGATION');
      setStatusMessage('5/5: Risk Score 94/100 → Autonomous Interception & Hangup');

      if (soundFxEnabled) {
        playThreatAlertPing();
      }

      setActiveSpeaker('assistant');
      await speakVoice(step2Data.assistantResponse, {
        role: 'assistant',
        voiceName: aiVoice,
        playbackRate: playbackSpeed,
      });
      setActiveSpeaker('none');

      if (soundFxEnabled) {
        playHangupTone();
      }

      setDemoStep('COMPLETED');
      setStatusMessage('Demo Call Completed • Saved to Audit Log');
      setIsAutoPlaying(false);
      onCallCompleted();
    } catch (err) {
      console.error('Auto-demo execution error:', err);
      setStatusMessage('Demo interrupted or network error');
      setIsAutoPlaying(false);
      setActiveSpeaker('none');
    }
  };

  // Toggle pause during demo recording
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
    if (!isPaused) {
      stopAudioPlayback();
      setStatusMessage('Simulation paused — ready to resume');
    } else {
      setStatusMessage('Resuming simulation run...');
    }
  };

  // Stop / Reset Demo Run
  const handleStopAutoDemo = () => {
    autoPlayAbortedRef.current = true;
    stopAudioPlayback();
    setIsAutoPlaying(false);
    setIsPaused(false);
    setActiveSpeaker('none');
    setCallState('IDLE');
    setDemoStep('IDLE');
    setCallTimerSec(0);
    setActiveCall(null);
    setStatusMessage('Ready to record video demo');
  };

  // Manual submission of caller utterance
  const handleManualSend = async (textToSend?: string) => {
    const text = textToSend || callerUtterance;
    if (!text.trim() || !activeCall) return;

    setIsProcessingTurn(true);
    stopAudioPlayback();

    try {
      const res = await fetch('/api/conversation/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: activeCall.id,
          callerUtterance: text,
        }),
      });

      if (!res.ok) throw new Error('Failed to process conversation step');
      const data = await res.json();
      setActiveCall(data.call);

      if (data.assistantResponse) {
        setActiveSpeaker('assistant');
        speakVoice(data.assistantResponse, {
          role: 'assistant',
          voiceName: aiVoice,
          onEnd: () => setActiveSpeaker('none'),
        });
      }

      if (data.action === 'CONNECT' || data.action === 'BLOCK') {
        setCallState('DECIDED');
        if (data.action === 'BLOCK' && soundFxEnabled) playThreatAlertPing();
        onCallCompleted();
      } else {
        const currentScenario = DEMO_SCENARIOS.find((s) => s.id === selectedScenarioId);
        if (currentScenario?.followUpCallerResponse && text !== currentScenario.followUpCallerResponse) {
          setCallerUtterance(currentScenario.followUpCallerResponse);
        } else {
          setCallerUtterance('');
        }
      }
    } catch (err) {
      console.error('Error in conversation step:', err);
    } finally {
      setIsProcessingTurn(false);
    }
  };

  // Speech to text browser integration
  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    setRecognitionError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionError('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCallerUtterance(transcript);
        setIsListening(false);
      };
      recognition.onerror = (event: any) => {
        setRecognitionError(`Mic error: ${event.error}. You can type directly.`);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setRecognitionError('Could not access microphone. Please type instead.');
      setIsListening(false);
    }
  };

  const getActionBadge = (action: RecommendedAction) => {
    if (action === 'BLOCK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#FF3131] text-black shadow-[0_0_10px_rgba(255,49,49,0.4)]">
          <XCircle className="w-3.5 h-3.5" /> REJECT & TERMINATE
        </span>
      );
    }
    if (action === 'CONNECT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#00FF41] text-black shadow-[0_0_10px_rgba(0,255,65,0.4)]">
          <CheckCircle2 className="w-3.5 h-3.5" /> CONNECT TO USER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-indigo-500 text-white">
        <Clock className="w-3.5 h-3.5" /> SCREEN FURTHER
      </span>
    );
  };

  // Video recording presenter notes
  const presenterScripts: Record<string, { title: string; bullets: string[] }> = {
    'scenario-2': {
      title: 'Scenario 2 — Urgent Bank OTP Scam (Recommended Demo)',
      bullets: [
        '1. Ringing: Unknown number calls. Layer 1 checks Truecaller & local database in sub-millisecond time.',
        '2. AI Greeting: CallGuard answers with human-like voice, screening identity without user impersonation.',
        '3. Caller Urgency: Scammer claims "bank security alert" and creates false urgency.',
        '4. Adaptive Question: CallGuard probes for employee ID and bank department.',
        '5. Scam Detection: Caller demands OTP verification code. Risk meter leaps to 94/100 (HIGH RISK).',
        '6. Autonomous Defense: CallGuard refuses code sharing and terminates call automatically!',
      ],
    },
    'scenario-1': {
      title: 'Scenario 1 — Legitimate Work Colleague Call',
      bullets: [
        '1. Layer 1 checks caller ID with zero negative reputation flags.',
        '2. CallGuard asks purpose. Caller identifies as Rahul discussing presentation.',
        '3. Risk score remains low (12/100). Safe signals detected.',
        '4. CallGuard politely announces connection and connects call to recipient!',
      ],
    },
    'scenario-3': {
      title: 'Scenario 3 — Prize & Lottery Scam',
      bullets: [
        '1. Caller claims recipient won a cash prize and requests code/processing fees.',
        '2. Risk engine identifies advance-fee lottery scam signals.',
        '3. Instant high-risk classification and autonomous termination.',
      ],
    },
    'scenario-4': {
      title: 'Scenario 4 — Android Telecom Blacklist Instant Block',
      bullets: [
        '1. Matches known fraud robocall ring directly on device.',
        '2. Rejection executes in <15ms conforming to Android CallScreeningService 5-second telecom deadline.',
        '3. Never exhausts battery or triggers unnecessary LLM compute.',
      ],
    },
    'scenario-5a': {
      title: 'Scenario 5A — Unknown Number → Scam Analysis (60–90s Analysis → Auto-Block)',
      bullets: [
        '1. Ring & Unknown Status: Unregistered number (+1 415 890-2341) rings. Layer 1 detects no prior blacklist entry.',
        '2. AI Answers: CallGuard picks up with human cadence, asking for identity and purpose.',
        '3. 60–90s Multi-turn Investigation: Caller claims urgent customs package and applies escalating pressure.',
        '4. Extortion & Card Harvesting: Caller demands immediate $4.50 fee and 16-digit debit card number & CVV.',
        '5. Deep Risk Analysis: CallGuard synthesizes the entire dialogue, detects financial coercion, and flags 95/100 (HIGH RISK).',
        '6. Autonomous Block & Blacklist: CallGuard terminates the call and dynamically records the number onto the device blacklist!',
      ],
    },
    'scenario-5b': {
      title: 'Scenario 5B — Unknown Number → Legitimate Verified (60–90s Analysis → Connect)',
      bullets: [
        '1. Ring & Unknown Status: Unregistered number (+1 415 890-2341) rings. Zero prior reports on record.',
        '2. AI Answers: CallGuard screens identity neutrally without revealing recipient presence.',
        '3. 60–90s Multi-turn Investigation: Clinic receptionist verifies Dr. Peterson consultation for tomorrow at 2:15 PM.',
        '4. Zero-Risk Confirmation: Receptionist clarifies zero payments, cards, or codes are required over the phone.',
        '5. Deep Risk Analysis: Risk score sits at 12/100 (LOW RISK). Benign verified healthcare appointment.',
        '6. Call Connection: CallGuard announces verification and safely routes the call to the recipient!',
      ],
    },
  };

  const currentScript = presenterScripts[selectedScenarioId] || presenterScripts['scenario-2'];

  return (
    <div className="space-y-6">
      {/* 🎬 DEMO VIDEO DIRECTOR SUITE (Top Bento Card) */}
      <div className="bg-[#121212] rounded-2xl border border-[#262626] p-6 shadow-xl relative overflow-hidden">
        {/* Glow Accent Top Border */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
            isAutoPlaying
              ? 'bg-gradient-to-r from-[#FF3131] via-[#00FF41] to-[#FF3131] animate-pulse'
              : 'bg-gradient-to-r from-neutral-800 via-[#00FF41]/40 to-neutral-800'
          }`}
        />

        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00FF41] bg-[#00FF41]/10 px-2 py-0.5 rounded border border-[#00FF41]/20 flex items-center gap-1">
                <Video className="w-3 h-3 text-[#00FF41]" />
                DEMO VIDEO RECORDING SUITE
              </span>
              {isAutoPlaying && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF3131] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#FF3131] animate-ping" />
                  REC ACTIVE
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#00FF41]" />
              Automated Voice Call Screening Simulation
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Full conversational telephone call simulation with natural Gemini neural voice, dual audio waveforms, and real-time risk gauges.
            </p>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPresenterScript(!showPresenterScript)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showPresenterScript
                  ? 'bg-[#1a1a1a] text-[#00FF41] border-[#00FF41]/40 shadow-xs'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Show suggested script talking points for your video narration"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showPresenterScript ? 'HIDE SCRIPT' : 'PRESENTER SCRIPT'}</span>
            </button>

            <button
              onClick={() => setSoundFxEnabled(!soundFxEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                soundFxEnabled
                  ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}
              title="Toggle telephone ring and telecom disconnect sound effects"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{soundFxEnabled ? 'SFX ON' : 'SFX MUTED'}</span>
            </button>

            {/* Mode Selector */}
            <div className="flex items-center p-0.5 rounded-lg bg-black border border-neutral-800 text-xs font-mono font-semibold">
              <button
                onClick={() => setSimulatorMode('AUTO_DEMO')}
                disabled={isAutoPlaying}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  simulatorMode === 'AUTO_DEMO'
                    ? 'bg-[#00FF41] text-black font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                AUTO-PLAY
              </button>
              <button
                onClick={() => setSimulatorMode('MANUAL')}
                disabled={isAutoPlaying}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  simulatorMode === 'MANUAL'
                    ? 'bg-neutral-700 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                MANUAL
              </button>
            </div>
          </div>
        </div>

        {/* Presenter Talking Points Drawer (Collapsible) */}
        {showPresenterScript && (
          <div className="mt-4 p-4 rounded-xl bg-[#0a0a0a] border border-[#00FF41]/30 text-xs font-mono">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-800">
              <span className="font-bold text-[#00FF41] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Video Recording Cheatsheet: {currentScript.title}
              </span>
              <span className="text-[10px] text-neutral-400">Read aloud while recording</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-neutral-300">
              {currentScript.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#121212] p-2 rounded border border-neutral-800">
                  <span className="text-[#00FF41] font-bold">›</span>
                  <span className="leading-relaxed">{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenario Selection Bento Grid */}
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3 flex items-center justify-between">
            <span>Select Scenario for Video Run</span>
            <span className="text-neutral-500 font-mono">6 Real-World Telecom Scenarios</span>
          </div>

          {/* Quick Toggle for Unknown Number Simulation */}
          {(selectedScenarioId === 'scenario-5a' || selectedScenarioId === 'scenario-5b') && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold text-amber-300">Unknown Caller (60–90s Analysis):</span>
                <span className="text-neutral-400 text-[11px]">Unregistered clean number screened across multiple turns</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectScenario('scenario-5a')}
                  disabled={isAutoPlaying || callState !== 'IDLE'}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedScenarioId === 'scenario-5a'
                      ? 'bg-[#FF3131] text-black shadow-[0_0_12px_rgba(255,49,49,0.5)]'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  🚨 Scam Analysis → Auto-Block
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectScenario('scenario-5b')}
                  disabled={isAutoPlaying || callState !== 'IDLE'}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedScenarioId === 'scenario-5b'
                      ? 'bg-[#00FF41] text-black shadow-[0_0_12px_rgba(0,255,65,0.5)]'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  🟢 Legitimate Verified → Connect
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEMO_SCENARIOS.map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              const isSafe = sc.expectedAction === 'CONNECT';
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.id)}
                  disabled={isAutoPlaying || callState !== 'IDLE'}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#00FF41] bg-[#00FF41]/5 shadow-[0_0_15px_rgba(0,255,65,0.15)] ring-1 ring-[#00FF41]'
                      : 'border-[#262626] bg-[#171717] hover:border-neutral-600 hover:bg-[#1c1c1c]'
                  } ${isAutoPlaying || callState !== 'IDLE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {sc.tag}
                        </span>
                        {sc.isExtendedScreening && (
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            60–90s Analysis
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isSafe
                            ? 'text-[#00FF41] bg-[#00FF41]/10 border-[#00FF41]/30'
                            : 'text-[#FF3131] bg-[#FF3131]/10 border-[#FF3131]/30'
                        }`}
                      >
                        {sc.expectedAction}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white truncate">{sc.callerName}</div>
                    <div className="text-xs text-neutral-400 font-mono mt-0.5">{sc.callerNumber}</div>
                    <p className="text-[11px] text-neutral-300 mt-2 line-clamp-2 italic border-t border-neutral-800/80 pt-2 font-mono">
                      "{sc.callerOpening}"
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00FF41] shadow-[0_0_6px_#00FF41]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Director Control Bar */}
        <div className="mt-5 pt-4 border-t border-[#262626] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Audio & Persona Settings */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* AI Voice Persona */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-neutral-400 text-[11px]">AI Voice:</span>
              <select
                value={aiVoice}
                onChange={(e) => setAiVoice(e.target.value as any)}
                disabled={isAutoPlaying}
                className="bg-[#0a0a0a] border border-neutral-700 text-[#00FF41] rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-[#00FF41]"
              >
                <option value="Zephyr">Zephyr (Warm & Natural)</option>
                <option value="Kore">Kore (Clear Executive)</option>
                <option value="Charon">Charon (Calm Male)</option>
                <option value="Fenrir">Fenrir (Assertive)</option>
              </select>
            </div>

            {/* Caller Voice Persona */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-neutral-400 text-[11px]">Caller Audio:</span>
              <select
                value={callerVoice}
                onChange={(e) => setCallerVoice(e.target.value as any)}
                disabled={isAutoPlaying}
                className="bg-[#0a0a0a] border border-neutral-700 text-neutral-200 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-[#00FF41]"
              >
                <option value="Puck">Puck (Natural Caller)</option>
                <option value="Fenrir">Fenrir (Urgent Scammer)</option>
                <option value="MUTE">Mute Caller (Speak yourself)</option>
              </select>
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-neutral-400 text-[11px]">Speed:</span>
              <div className="flex rounded bg-[#0a0a0a] border border-neutral-800 p-0.5">
                {[1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                      playbackSpeed === spd ? 'bg-[#00FF41] text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {!isAutoPlaying ? (
              <button
                onClick={handleStartAutoDemo}
                className="w-full md:w-auto px-6 py-2.5 bg-[#00FF41] hover:bg-[#00e63a] text-black text-sm font-bold font-mono tracking-tight rounded-xl shadow-[0_0_20px_rgba(0,255,65,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                START VIDEO DEMO RUN
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePause}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-black" /> : <Pause className="w-3.5 h-3.5" />}
                  {isPaused ? 'RESUME' : 'PAUSE'}
                </button>

                <button
                  onClick={handleStopAutoDemo}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold font-mono rounded-lg border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RESTART / STOP
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Stage Stepper / Progress Bar (Video-Ready Telemetry) */}
        {isAutoPlaying && (
          <div className="mt-5 pt-4 border-t border-[#262626]">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-[#00FF41] font-bold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 animate-spin" />
                {statusMessage}
              </span>
              <span className="text-neutral-400">
                Speed: {playbackSpeed}x • AI Voice: {aiVoice}
              </span>
            </div>

            {(() => {
              const currentScenario = DEMO_SCENARIOS.find((s) => s.id === selectedScenarioId);
              const isExtended = Boolean(currentScenario?.isExtendedScreening);

              const steps = isExtended
                ? [
                    { key: 'RINGING', label: '1. Ring & Unregistered Check' },
                    { key: 'AI_GREETING', label: '2. AI Pickup' },
                    { key: 'CALLER_TURN_1', label: '3. Turn 1 (0:22s)' },
                    { key: 'AI_FOLLOWUP', label: '4. Turn 2 (0:48s)' },
                    { key: 'CALLER_TURN_2', label: '5. Turn 3 (1:16s)' },
                    { key: 'MITIGATION', label: '6. 60–90s Risk Verdict' },
                  ]
                : [
                    { key: 'RINGING', label: '1. Ring & Lookup' },
                    { key: 'AI_GREETING', label: '2. AI Greeting' },
                    { key: 'CALLER_TURN_1', label: '3. Caller Statement' },
                    { key: 'AI_FOLLOWUP', label: '4. Clarification' },
                    { key: 'MITIGATION', label: '5. Threat & Hangup' },
                  ];

              const stepOrder = isExtended
                ? ['RINGING', 'AI_GREETING', 'CALLER_TURN_1', 'AI_FOLLOWUP', 'CALLER_TURN_2', 'MITIGATION', 'COMPLETED']
                : ['RINGING', 'AI_GREETING', 'CALLER_TURN_1', 'AI_FOLLOWUP', 'MITIGATION', 'COMPLETED'];

              const currentIdx = stepOrder.indexOf(demoStep);

              return (
                <div className={`grid ${isExtended ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5`}>
                  {steps.map((step, idx) => {
                    const isPassed = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div
                        key={step.key}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCurrent
                            ? 'bg-[#00FF41] shadow-[0_0_10px_#00FF41] animate-pulse'
                            : isPassed
                            ? 'bg-[#00FF41]/70'
                            : 'bg-neutral-800'
                        }`}
                        title={step.label}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 📱 ACTIVE CALL WORKSPACE (Bento Grid) */}
      {(callState !== 'IDLE' || activeCall) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Call Dialogue & Active Audio Terminal (7 cols) */}
          <div className="lg:col-span-7 bg-[#121212] rounded-2xl border border-[#262626] shadow-xl flex flex-col h-[640px] overflow-hidden">
            {/* Active Call Header with Live Waveforms */}
            <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#161616]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    callState === 'RINGING'
                      ? 'bg-amber-500/20 text-amber-400 animate-bounce border border-amber-500/40'
                      : activeCall?.status === 'CONNECTED'
                      ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40'
                      : activeCall?.status?.startsWith('BLOCKED')
                      ? 'bg-[#FF3131]/20 text-[#FF3131] border border-[#FF3131]/40'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{activeCall?.callerName || customName}</span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {activeCall?.callerNumber || customNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Layer 1: {activeCall?.reputation?.provider || 'LocalSpamDatabase'} •{' '}
                      {activeCall?.reputation?.score || 20}% spam rating
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Active Call Elapsed Timer */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-300">
                  <Clock className="w-3.5 h-3.5 text-[#00FF41]" />
                  <span className="font-bold text-white tracking-wider">{formatCallDuration(callTimerSec)}</span>
                  {DEMO_SCENARIOS.find((s) => s.id === selectedScenarioId)?.isExtendedScreening && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                      60–90s Analysis
                    </span>
                  )}
                </div>

                {/* Active Audio Waveform Indicator */}
                <AudioWaveform
                  isActive={activeSpeaker !== 'none'}
                  color={activeSpeaker === 'assistant' ? 'green' : activeSpeaker === 'caller' ? 'red' : 'blue'}
                  barCount={10}
                  label={activeSpeaker === 'assistant' ? 'CallGuard Voice' : activeSpeaker === 'caller' ? 'Caller Speaking' : undefined}
                />

                {activeCall && getActionBadge(activeCall.recommendedAction)}

                <button
                  onClick={handleStopAutoDemo}
                  className="p-2 text-neutral-400 hover:text-[#FF3131] hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  title="Hang up / Stop"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Transcript Feed */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0a0a0a]">
              {/* Ringing Visual Notice */}
              {callState === 'RINGING' && (
                <div className="flex justify-center my-4 animate-pulse">
                  <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    Incoming telephone call ringing... Layer 1 reputation screening in progress
                  </div>
                </div>
              )}

              {activeCall?.transcript.map((item) => {
                if (item.role === 'system') {
                  return (
                    <div key={item.id} className="flex justify-center">
                      <div className="text-[11px] font-mono text-neutral-400 bg-[#161616] border border-[#262626] px-3.5 py-1 rounded-full flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-[#00FF41]" />
                        {item.text}
                      </div>
                    </div>
                  );
                }

                if (item.role === 'assistant') {
                  return (
                    <div key={item.id} className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-xl bg-[#00FF41] text-black flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5 shadow-[0_0_12px_rgba(0,255,65,0.4)]">
                        AI
                      </div>
                      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl rounded-tl-none p-3.5 shadow-md">
                        <div className="text-[10px] font-mono uppercase font-bold text-[#00FF41] mb-1 flex items-center justify-between">
                          <span>CallGuard Screener</span>
                          <span className="text-[9px] text-neutral-400 font-normal">
                            Generic Human Voice ({aiVoice})
                          </span>
                        </div>
                        <p className="text-sm text-neutral-100 leading-relaxed font-sans">{item.text}</p>
                      </div>
                    </div>
                  );
                }

                // Caller Utterance
                return (
                  <div key={item.id} className="flex flex-col items-end">
                    <div className="flex gap-3 max-w-[85%] justify-end">
                      <div className="bg-[#1f1f1f] border border-white/10 text-white rounded-2xl rounded-tr-none p-3.5 shadow-md">
                        <div className="text-[10px] font-mono uppercase font-bold text-neutral-400 mb-1 flex items-center justify-end gap-1.5">
                          <span>Caller: {activeCall.callerName}</span>
                        </div>
                        <p className="text-sm text-white font-mono leading-relaxed">{item.text}</p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 border border-neutral-700">
                        C
                      </div>
                    </div>

                    {item.riskUpdate && (
                      <div className="mt-1.5 mr-11 text-[10px] font-mono text-neutral-400 flex flex-wrap items-center gap-1.5 justify-end">
                        <span>Risk Score: {item.riskUpdate.score}/100</span>
                        {item.riskUpdate.signals.map((sig, i) => (
                          <span
                            key={i}
                            className="text-[#FF3131] bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 font-bold"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Processing typing indicator */}
              {isProcessingTurn && (
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 p-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-ping" />
                  Analyzing conversational risk & intent signals...
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>

            {/* Bottom Dock (Controls based on mode) */}
            <div className="p-4 border-t border-[#262626] bg-[#121212]">
              {callState === 'DECIDED' ? (
                <div className="p-3.5 rounded-xl bg-[#171717] border border-[#262626] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {activeCall?.recommendedAction === 'CONNECT' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00FF41]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#FF3131]" />
                    )}
                    <span className="text-sm font-medium text-white">
                      Finalized with action:{' '}
                      <strong
                        className={
                          activeCall?.recommendedAction === 'CONNECT' ? 'text-[#00FF41]' : 'text-[#FF3131]'
                        }
                      >
                        {activeCall?.recommendedAction === 'CONNECT' ? 'CONNECTED TO RECIPIENT' : 'BLOCKED & TERMINATED'}
                      </strong>
                    </span>
                  </div>
                  <button
                    onClick={() => activeCall && onSelectCallForDetails(activeCall)}
                    className="text-xs font-mono font-bold text-[#00FF41] hover:underline cursor-pointer"
                  >
                    INSPECT ANALYSIS →
                  </button>
                </div>
              ) : simulatorMode === 'AUTO_DEMO' ? (
                <div className="flex items-center justify-between text-xs font-mono text-neutral-400 p-2 bg-[#0a0a0a] rounded-lg border border-neutral-800">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                    Auto-Play Demo running: audio prompts, transcript, and risk engine advance synchronously.
                  </span>
                  <button
                    onClick={() => handleManualSend()}
                    className="text-[#00FF41] hover:underline font-bold cursor-pointer"
                  >
                    Advance Step →
                  </button>
                </div>
              ) : (
                /* Manual Input Bar */
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        isListening
                          ? 'bg-red-500/20 border-red-500 text-[#FF3131] animate-pulse'
                          : 'bg-[#1a1a1a] border-[#333333] text-neutral-300 hover:bg-neutral-800'
                      }`}
                      title={isListening ? 'Stop listening' : 'Speak into microphone'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input
                      type="text"
                      value={callerUtterance}
                      onChange={(e) => setCallerUtterance(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isProcessingTurn) {
                          handleManualSend();
                        }
                      }}
                      disabled={isProcessingTurn}
                      placeholder="Type caller statement or speak into mic..."
                      className="flex-1 px-3.5 py-2 text-sm bg-[#080808] border border-[#262626] text-white rounded-lg focus:outline-none focus:border-[#00FF41] font-mono"
                    />

                    <button
                      type="button"
                      onClick={() => handleManualSend()}
                      disabled={isProcessingTurn || !callerUtterance.trim()}
                      className="px-5 py-2 bg-[#00FF41] hover:bg-[#00e63a] disabled:opacity-40 text-black text-sm font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isProcessingTurn ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ANALYZING
                        </>
                      ) : (
                        <>
                          SEND TURN <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  {recognitionError && (
                    <div className="text-xs text-[#FF3131] font-mono">{recognitionError}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Risk Telemetry & Scam Signal Radar (5 cols) */}
          <div className="lg:col-span-5 bg-[#121212] rounded-2xl border border-[#262626] shadow-xl p-6 flex flex-col justify-between">
            <div>
              {/* Score Circular Gauge & Status */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#262626]">
                <div
                  className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-bold font-mono transition-all duration-500 ${
                    (activeCall?.riskScore || 0) >= 70
                      ? 'border-[#FF3131] text-[#FF3131] bg-red-500/10 shadow-[0_0_20px_rgba(255,49,49,0.3)]'
                      : (activeCall?.riskScore || 0) >= 35
                      ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                      : 'border-[#00FF41] text-[#00FF41] bg-[#00FF41]/10 shadow-[0_0_20px_rgba(0,255,65,0.2)]'
                  }`}
                >
                  <span className="text-2xl leading-none">{activeCall?.riskScore || 0}</span>
                  <span className="text-[9px] uppercase tracking-tighter opacity-70">/ 100</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        activeCall?.riskLevel === 'HIGH'
                          ? 'bg-red-500/20 text-[#FF3131] border border-red-500/30'
                          : activeCall?.riskLevel === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/30'
                      }`}
                    >
                      {activeCall?.riskLevel || 'LOW'} RISK
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      Layer 2 AI Screener
                    </span>
                  </div>
                  <h3 className="text-base font-bold leading-tight text-white mt-1">
                    {activeCall?.riskLevel === 'HIGH'
                      ? 'High-Risk Fraud Intercepted'
                      : activeCall?.riskLevel === 'MEDIUM'
                      ? 'Suspicious Signal Detected'
                      : 'Low Risk • Legitimate Caller'}
                  </h3>
                </div>
              </div>

              {/* Real-Time Risk Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-neutral-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-[#00FF41]" />
                    Live Scam Risk Metric
                  </span>
                  <span className="font-bold text-white">{activeCall?.riskScore || 0}/100</span>
                </div>
                <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      (activeCall?.riskScore || 0) >= 70
                        ? 'bg-[#FF3131] shadow-[0_0_12px_rgba(255,49,49,0.9)]'
                        : (activeCall?.riskScore || 0) >= 35
                        ? 'bg-amber-400'
                        : 'bg-[#00FF41] shadow-[0_0_12px_rgba(0,255,65,0.9)]'
                    }`}
                    style={{ width: `${Math.max(6, activeCall?.riskScore || 0)}%` }}
                  />
                </div>
              </div>

              {/* Detected Conversational Signals */}
              <div className="mb-6">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2 font-mono">
                  Extracted Conversational Signals
                </span>
                {!activeCall || activeCall.detectedSignals.length === 0 ? (
                  <div className="text-xs text-neutral-400 italic p-3 bg-neutral-900/50 rounded-xl border border-neutral-800 font-mono">
                    Awaiting caller utterance to extract urgency, OTP demands, or financial keywords...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeCall.detectedSignals.map((signal, idx) => {
                      const isNormal = signal.includes('Normal') || signal.includes('Safe');
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-md font-semibold border flex items-center gap-1.5 ${
                            isNormal
                              ? 'bg-[#00FF41]/10 border-[#00FF41]/40 text-[#00FF41]'
                              : 'bg-red-500/15 border-red-500/40 text-[#FF3131] animate-pulse'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {signal}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scam Category & Intent */}
              <div className="space-y-4 mb-6">
                <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono block">
                    Scam Classification Category
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5 font-sans">
                    {activeCall?.scamCategory || 'Awaiting classification'}
                  </p>
                </div>

                <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono block">
                    Caller Intent Analysis
                  </span>
                  <p className="text-xs font-mono text-neutral-200 mt-0.5">
                    {activeCall?.intent || 'General incoming call'}
                  </p>
                </div>

                {activeCall?.explanation && (
                  <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono block mb-1">
                      AI Reasoning Rationale
                    </span>
                    <p className="text-[11px] leading-relaxed text-neutral-300 font-sans italic">
                      "{activeCall.explanation}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="pt-4 border-t border-[#262626] flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-mono font-semibold block">
                  Mitigation Action
                </span>
                <p
                  className={`text-xs font-bold font-mono uppercase tracking-widest mt-0.5 ${
                    activeCall?.recommendedAction === 'CONNECT'
                      ? 'text-[#00FF41]'
                      : activeCall?.recommendedAction === 'BLOCK'
                      ? 'text-[#FF3131]'
                      : 'text-indigo-400'
                  }`}
                >
                  {activeCall?.recommendedAction === 'BLOCK'
                    ? 'AUTONOMOUS BLOCK & BLACKLIST'
                    : activeCall?.recommendedAction === 'CONNECT'
                    ? 'CONNECTED TO RECIPIENT'
                    : 'SCREEN FURTHER'}
                </p>
              </div>

              <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41]" />
                Neural TTS Ready
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
