import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Play, Pause, Square, Mic, Volume2, History, Bot, User,
  Sparkles, Loader2, CheckCircle, AlertTriangle, ChevronDown, PhoneOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateSummary } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';
import { initiateCall, endCall, connectTranscriptStream, TranscriptLine } from '../services/callService';
import { Client, Settings } from '../types';

type CallMode = 'idle' | 'selecting' | 'dialing' | 'active' | 'analyzing' | 'summary' | 'demo_dialing' | 'demo_active';

const DEMO_TRANSCRIPT: Array<{ role: 'agent' | 'customer'; text: string }> = [
  { role: 'agent', text: "Hello John, this is VocalBridge AI. How are you today?" },
  { role: 'customer', text: "Hey, I'm good. What's this about?" },
  { role: 'agent', text: "I'm calling to discuss our new cloud automation suite. I see you've been looking for a more scalable solution." },
  { role: 'customer', text: "Yeah, but honestly, your pricing seems 20% higher than what we have now." },
  { role: 'agent', text: "I understand the price concern. However, our downtime reduction saves typical firms $2k monthly. Shall we look at the ROI?" },
  { role: 'customer', text: "Hmm, that's interesting. Can you send over a detailed doc?" },
  { role: 'agent', text: "Absolutely. I'll include the case study for similar-sized agencies. Let's talk again Thursday?" },
  { role: 'customer', text: "Sure, Thursday works. Around 2 PM." },
];

const OUTCOMES = ['Sale Made', 'Follow-up Scheduled', 'Not Interested', 'No Answer'];

export default function CallMonitor() {
  const [mode, setMode] = useState<CallMode>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Array<TranscriptLine & { time: string }>>([]);
  const [callDuration, setCallDuration] = useState('00:00');
  const [summary, setSummary] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadClients();
    loadSettings();
    return () => {
      if (transcriptIntervalRef.current) clearInterval(transcriptIntervalRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  async function loadClients() {
    const data = await firebaseService.getClients();
    if (data) setClients(data.filter(c => c.status === 'pending' || c.status === 'follow_up'));
  }

  async function loadSettings() {
    const data = await firebaseService.getSettings();
    if (data) setSettings(data);
  }

  function startDurationTimer() {
    callStartRef.current = Date.now();
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - callStartRef.current) / 1000);
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      setCallDuration(`${m}:${s}`);
    }, 1000);
  }

  function stopDurationTimer() {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }

  // ── Real Call ────────────────────────────────────────────────────────────────

  async function handleStartRealCall() {
    if (!selectedClient) return;
    setMode('dialing');
    setError(null);
    setTranscript([]);
    setSummary(null);

    try {
      const { callId } = await initiateCall({
        clientName: selectedClient.name,
        phoneNumber: selectedClient.phoneNumber,
        voiceName: settings?.persona.voiceName ?? 'Kore',
        agentName: settings?.persona.name ?? 'Alex',
        systemInstruction: settings?.persona.systemInstruction,
      });

      setActiveCallId(callId);

      // Connect WebSocket for real-time transcript
      wsRef.current = connectTranscriptStream(callId, {
        onConnected: () => setMode('dialing'),
        onCallAnswered: () => {
          setMode('active');
          startDurationTimer();
        },
        onTranscript: (line) => {
          setTranscript(prev => [...prev, { ...line }]);
        },
        onCallEnded: async (data) => {
          stopDurationTimer();
          await finishCall(callId, selectedClient, data.transcript);
        },
        onError: (err) => {
          setError(`Connection error: ${err.message}. Transcript will update when available.`);
        },
      });

      // If call rings but doesn't connect within 30s, show timeout
      setTimeout(() => {
        if (mode === 'dialing') {
          setError('Call is ringing — waiting for lead to answer...');
        }
      }, 30_000);

    } catch (err: any) {
      setError(err.message);
      setMode('idle');
    }
  }

  async function handleEndRealCall() {
    if (!activeCallId || !selectedClient) return;
    stopDurationTimer();
    wsRef.current?.close();
    try {
      const finalTranscript = await endCall(activeCallId);
      await finishCall(activeCallId, selectedClient, finalTranscript.length > 0 ? finalTranscript : transcript);
    } catch (err: any) {
      setError(`Failed to end call: ${err.message}`);
      await finishCall(activeCallId, selectedClient, transcript);
    }
  }

  async function finishCall(callId: string, client: Client, lines: TranscriptLine[]) {
    setMode('analyzing');
    setTranscript(lines);

    const transcriptText = lines.map(l => `${l.role}: ${l.text}`).join('\n');
    try {
      const aiSummary = await generateSummary(client.name, transcriptText);
      setSummary(aiSummary);

      await firebaseService.addCall({
        clientId: client.id,
        clientName: client.name,
        status: 'completed',
        startTime: new Date().toISOString(),
        summary: aiSummary.nextSteps,
        sentiment: aiSummary.sentiment,
        outcome: aiSummary.outcome,
        roiProjection: aiSummary.roiProjection,
        upsellOpportunities: aiSummary.upsellOpportunities,
        transcript: lines,
      });

      // Update client status based on outcome
      const statusMap: Record<string, Client['status']> = {
        'Sale Made': 'interested',
        'Follow-up Scheduled': 'follow_up',
        'Not Interested': 'not_interested',
        'No Answer': 'no_answer',
      };
      const newStatus = statusMap[aiSummary.outcome];
      if (newStatus) {
        await firebaseService.updateClient(client.id, { status: newStatus, lastCallId: callId });
      }
    } catch (err) {
      console.error('Summary/save failed:', err);
      setSummary({ outcome: 'Follow-up Scheduled', sentiment: 'Neutral', roiProjection: 'Unable to generate at this time.', upsellOpportunities: [] });
    } finally {
      setMode('summary');
      setActiveCallId(null);
    }
  }

  // ── Demo Call ────────────────────────────────────────────────────────────────

  function handleStartDemoCall() {
    setMode('demo_dialing');
    setSummary(null);
    setTranscript([]);
    setError(null);

    setTimeout(() => {
      setMode('demo_active');
      startDurationTimer();
      let count = 0;
      if (transcriptIntervalRef.current) clearInterval(transcriptIntervalRef.current);
      transcriptIntervalRef.current = setInterval(() => {
        if (count < DEMO_TRANSCRIPT.length) {
          setTranscript(prev => [...prev, {
            ...DEMO_TRANSCRIPT[count],
            time: new Date().toLocaleTimeString()
          }]);
          count++;
        } else {
          if (transcriptIntervalRef.current) clearInterval(transcriptIntervalRef.current);
        }
      }, 3000);
    }, 1500);
  }

  async function handleEndDemoCall() {
    if (transcriptIntervalRef.current) clearInterval(transcriptIntervalRef.current);
    stopDurationTimer();
    setMode('analyzing');

    const transcriptText = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
    try {
      const aiSummary = await generateSummary('John Doe', transcriptText);
      setSummary(aiSummary);
      await firebaseService.addCall({
        clientId: 'demo_client',
        clientName: 'John Doe (Demo)',
        status: 'completed',
        startTime: new Date().toISOString(),
        summary: aiSummary.nextSteps,
        sentiment: aiSummary.sentiment,
        outcome: aiSummary.outcome,
        roiProjection: aiSummary.roiProjection,
        upsellOpportunities: aiSummary.upsellOpportunities,
        transcript,
      });
    } catch {
      setSummary({ outcome: 'Follow-up Scheduled', sentiment: 'Positive', roiProjection: 'Demo call analysis.', upsellOpportunities: ['Enterprise Suite'] });
    } finally {
      setMode('summary');
    }
  }

  function reset() {
    setMode('idle');
    setTranscript([]);
    setSummary(null);
    setError(null);
    setCallDuration('00:00');
    setSelectedClient(null);
    setActiveCallId(null);
  }

  const isCallActive = mode === 'active' || mode === 'demo_active';
  const isDialing = mode === 'dialing' || mode === 'demo_dialing';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Main Call Panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#151619] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <div className="w-32 h-32 border-2 border-dashed border-white rounded-full animate-spin-slow" />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Active Call Terminal</h2>
                <p className="text-[#8E9299] text-xs font-mono uppercase mt-1">
                  {mode === 'summary' ? 'Call Analyzed' :
                   isCallActive ? 'Voice Link Established' :
                   isDialing ? 'Connecting...' : 'Operational'}
                </p>
              </div>
              <div className="flex gap-2">
                <div className={cn("w-2 h-2 rounded-full transition-colors", isCallActive ? "bg-green-500 animate-pulse" : "bg-[#8E9299]")} />
                <div className="w-2 h-2 rounded-full bg-[#8E9299]" />
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">

              {/* IDLE: client picker + launch buttons */}
              {mode === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="py-8 space-y-6">
                  {/* Client selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Select Lead to Call</p>
                    <div className="relative">
                      <select
                        value={selectedClient?.id ?? ''}
                        onChange={e => {
                          const c = clients.find(cl => cl.id === e.target.value) ?? null;
                          setSelectedClient(c);
                        }}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 pr-10 appearance-none text-sm focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                      >
                        <option value="" disabled>— Choose a lead —</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#1a1a1a]">
                            {c.name} · {c.phoneNumber}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299] pointer-events-none" />
                    </div>
                    {clients.length === 0 && (
                      <p className="text-xs text-[#8E9299] italic">No pending leads. Add leads in the Clients tab first.</p>
                    )}
                  </div>

                  {/* Launch buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleStartRealCall}
                      disabled={!selectedClient}
                      className="flex-1 px-6 py-3 bg-[#F27D26] text-[#1a1a1a] rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(242,125,38,0.4)] transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" /> Start Real Call
                    </button>
                    <button
                      onClick={handleStartDemoCall}
                      className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all text-sm"
                    >
                      Run Demo Call
                    </button>
                  </div>
                </motion.div>
              )}

              {/* DIALING */}
              {isDialing && (
                <motion.div key="dialing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-16 flex flex-col items-center gap-6">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#F27D26] animate-spin flex items-center justify-center">
                    <Phone className="w-10 h-10 text-[#F27D26]" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-medium">
                      {mode === 'demo_dialing' ? 'Starting Demo...' : `Calling ${selectedClient?.name}...`}
                    </p>
                    <p className="text-[#8E9299] text-xs font-mono mt-2 uppercase tracking-widest">
                      {mode === 'demo_dialing' ? 'Simulating call setup' : selectedClient?.phoneNumber}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ACTIVE CALL */}
              {isCallActive && (
                <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-[#8E9299] uppercase">Speaking With</p>
                      <p className="text-3xl font-medium mt-1">
                        {mode === 'demo_active' ? 'John Doe (Demo)' : selectedClient?.name}
                      </p>
                      <p className="text-[#F27D26] font-mono mt-2 tracking-widest text-sm">
                        {mode === 'demo_active' ? '+1 (555) 123-4567' : selectedClient?.phoneNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-[#8E9299] uppercase">Duration</p>
                      <p className="text-4xl font-mono font-bold mt-1 tabular-nums">{callDuration}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 py-6 border-y border-white/5">
                    <button className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      onClick={mode === 'demo_active' ? handleEndDemoCall : handleEndRealCall}
                      className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-[0_0_40px_rgba(239,68,68,0.3)]"
                      title="End call"
                    >
                      <PhoneOff className="w-8 h-8" />
                    </button>
                    <button className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ANALYZING */}
              {mode === 'analyzing' && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-20 flex flex-col items-center gap-6">
                  <div className="w-16 h-16 relative">
                    <Loader2 className="w-16 h-16 text-[#F27D26] animate-spin absolute inset-0" />
                    <Sparkles className="w-8 h-8 text-white absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Generating AI Insights</h3>
                    <p className="text-[#8E9299] text-xs font-mono mt-2 uppercase tracking-widest">
                      Analysing transcript & sentiment...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* SUMMARY */}
              {mode === 'summary' && summary && (
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase mb-2">Sentiment</p>
                      <div className="flex items-center gap-2">
                        {summary.sentiment === 'Positive'
                          ? <CheckCircle className="text-green-500 w-4 h-4" />
                          : <AlertTriangle className="text-yellow-500 w-4 h-4" />}
                        <p className="font-bold">{summary.sentiment}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase mb-2">Outcome</p>
                      <div className="flex flex-wrap gap-1">
                        {OUTCOMES.map(o => (
                          <button key={o}
                            onClick={() => setSummary({ ...summary, outcome: o })}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold transition-all border",
                              summary.outcome === o
                                ? "bg-[#F27D26] border-[#F27D26] text-[#1a1a1a]"
                                : "bg-white/5 border-white/10 text-[#8E9299] hover:border-white/30"
                            )}
                          >{o}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase">ROI Projection</p>
                      <p className="text-xs opacity-80 leading-relaxed">{summary.roiProjection || 'Calculating...'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase">Upsell Opportunities</p>
                      <div className="flex flex-wrap gap-1">
                        {(summary.upsellOpportunities || ['Enterprise Suite']).map((u: string, i: number) => (
                          <span key={i} className="text-[10px] bg-[#F27D26]/20 text-[#F27D26] px-2 py-0.5 rounded-full font-bold">{u}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {summary.nextSteps && (
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-bold text-[#8E9299] uppercase mb-1">Next Steps</p>
                      <p className="text-xs opacity-80 leading-relaxed">{summary.nextSteps}</p>
                    </div>
                  )}
                  {/* Recording playback UI */}
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F27D26]/10 flex items-center justify-center">
                          <Volume2 className="w-5 h-5 text-[#F27D26]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Call Recording</p>
                          <p className="text-[10px] text-[#8E9299]">Duration: {callDuration}</p>
                        </div>
                      </div>
                      <button onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-[#F27D26]"
                        initial={{ width: 0 }}
                        animate={{ width: isPlaying ? '65%' : '0%' }}
                        transition={{ duration: isPlaying ? 10 : 0, ease: 'linear' }}
                      />
                    </div>
                  </div>
                  <button onClick={reset}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                    New Call
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Live Transcript */}
        <div className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-[#8E9299]" />
              Real-time Transcription
            </h3>
            {isCallActive && (
              <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold uppercase">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" /> Live Feed
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
            {transcript.length > 0 ? (
              transcript.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex gap-4 p-4 rounded-2xl max-w-[90%]",
                    msg.role === 'agent'
                      ? "bg-[#FDFCFB] border border-[#1a1a1a]/5 self-start"
                      : "bg-[#F27D26]/5 border border-[#F27D26]/10 self-end flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                    msg.role === 'agent' ? "bg-[#1a1a1a]" : "bg-[#F27D26]"
                  )}>
                    {msg.role === 'agent' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-[#1a1a1a]" />}
                  </div>
                  <div className={msg.role === 'customer' ? 'text-right' : ''}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299]">{msg.role}</p>
                      <span className="text-[10px] font-mono text-[#8E9299] opacity-50 bg-gray-100 px-1 rounded">{msg.time}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#1a1a1a]">{msg.text}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center opacity-20 flex-col gap-4 py-20">
                <History className="w-12 h-12" />
                <p className="text-sm font-bold uppercase tracking-widest">Awaiting Audio Stream</p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* Right: Live Intelligence Panel */}
      <div className="space-y-6">
        <div className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#F27D26]/5 rounded-full blur-2xl" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F27D26]" />
            Live Suggestions
          </h3>
          <div className="space-y-3">
            {transcript.some(t => t.text.toLowerCase().includes('pricing') || t.text.toLowerCase().includes('cost') || t.text.toLowerCase().includes('price')) ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-2xl">
                <p className="text-xs font-bold text-[#F27D26] mb-1">Pricing Trigger Detected</p>
                <p className="text-[11px] leading-tight text-[#1a1a1a]">Customer raised pricing. Highlight ROI and TCO reduction. Offer to share the cost comparison sheet.</p>
              </motion.div>
            ) : transcript.some(t => t.text.toLowerCase().includes('competitor') || t.text.toLowerCase().includes('alternative')) ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-xs font-bold text-blue-600 mb-1">Competitor Mention</p>
                <p className="text-[11px] leading-tight text-[#1a1a1a]">Acknowledge their choice, then pivot to your differentiators: support SLA, integration depth, and our migration path.</p>
              </motion.div>
            ) : (
              <p className="text-xs text-[#8E9299] italic">AI listening for knowledge triggers...</p>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] text-white rounded-3xl p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E9299] mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4" /> Agent Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-60">Voice Engine</span>
              <span className="text-xs font-bold text-green-500 uppercase">{settings?.persona.voiceName ?? 'Kore'} / Gemini</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-60">Mode</span>
              <span className={cn("text-xs font-bold uppercase", isCallActive ? "text-green-500" : "text-[#8E9299]")}>
                {isCallActive ? 'Live' : mode === 'idle' ? 'Ready' : mode.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-60">Calls in system</span>
              <span className="text-xs font-mono">{transcript.length > 0 ? '1 active' : '0'}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className={cn("h-full transition-all duration-500", isCallActive ? "bg-[#F27D26] w-3/4" : "bg-white/20 w-1/4")} />
            </div>
            <p className="text-[10px] text-[#8E9299] text-center uppercase tracking-widest">
              {settings?.persona.name ?? 'VocalBridge AI'} · {settings?.persona.tone ?? 'Professional'}
            </p>
          </div>
        </div>

        {/* Selected client info */}
        {selectedClient && mode === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">Selected Lead</p>
            <div>
              <p className="font-bold">{selectedClient.name}</p>
              <p className="text-sm text-[#8E9299]">{selectedClient.phoneNumber}</p>
              {selectedClient.info && <p className="text-xs text-[#8E9299] mt-1">{selectedClient.info}</p>}
            </div>
            {selectedClient.tags && selectedClient.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedClient.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] text-gray-500">{t}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
