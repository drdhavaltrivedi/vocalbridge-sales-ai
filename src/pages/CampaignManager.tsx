import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ListChecks, Plus, Play, Pause, Square, Phone, PhoneOff,
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight,
  Search, Users, Bot, User, History, Sparkles, Loader2,
  CalendarClock, BarChart3, X, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { initiateCall, endCall, connectTranscriptStream, TranscriptLine } from '../services/callService';
import { generateSummary } from '../services/geminiService';
import { Campaign, CampaignStatus, Client, KnowledgeBaseDoc, Settings } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  running:   { label: 'Running',   color: 'bg-green-100 text-green-700' },
  paused:    { label: 'Paused',    color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
};

const OUTCOME_COLORS: Record<string, string> = {
  'Sale Made':           'bg-green-100 text-green-700',
  'Follow-up Scheduled': 'bg-blue-100 text-blue-700',
  'Not Interested':      'bg-red-100 text-red-600',
  'No Answer':           'bg-gray-100 text-gray-500',
};

function wait(ms: number) {
  return new Promise<void>(res => setTimeout(res, ms));
}

const DEFAULT_SETTINGS = { delayBetweenCalls: 5, retryNoAnswer: false, retryDelayMinutes: 30 };

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CampaignManager() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shared data (loaded once)
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeBaseDoc[]>([]);

  // Live call state (when campaign is running)
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Array<TranscriptLine & { time: string }>>([]);
  const [callDuration, setCallDuration] = useState('00:00');
  const [callError, setCallError] = useState<string | null>(null);
  const [callMode, setCallMode] = useState<'idle' | 'dialing' | 'active' | 'analyzing'>('idle');
  // Map of clientId → outcome (populated as calls finish)
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const campaignRef = useRef<Campaign | null>(null);
  const runningRef = useRef(false);

  useEffect(() => { campaignRef.current = activeCampaign; }, [activeCampaign]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    Promise.all([
      loadCampaigns(),
      firebaseService.getClients().then(d => d && setAllClients(d)),
      firebaseService.getSettings().then(d => d && setSettings(d)),
      firebaseService.getKnowledgeBase().then(d => d && setKnowledgeDocs(d)),
    ]).finally(() => setLoading(false));
  }, []);

  // Check for scheduled campaigns that are due
  useEffect(() => {
    if (!campaigns.length) return;
    const now = new Date();
    const due = campaigns.filter(
      c => c.status === 'scheduled' && c.scheduledAt && new Date(c.scheduledAt) <= now
    );
    for (const c of due) autoStartCampaign(c);
  }, [campaigns]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCampaigns() {
    const data = await firebaseService.getCampaigns();
    if (data) setCampaigns(data);
  }

  async function refreshActiveCampaign(id: string) {
    const updated = await firebaseService.getCampaign(id);
    if (updated) {
      setActiveCampaign(updated);
      setCampaigns(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }

  // ── Duration timer ────────────────────────────────────────────────────────────

  function startTimer() {
    callStartRef.current = Date.now();
    if (durationRef.current) clearInterval(durationRef.current);
    durationRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - callStartRef.current) / 1000);
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      setCallDuration(`${m}:${s}`);
    }, 1000);
  }

  function stopTimer() {
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
  }

  // ── Campaign orchestration ────────────────────────────────────────────────────

  async function autoStartCampaign(campaign: Campaign) {
    const updated = await firebaseService.getCampaign(campaign.id);
    if (updated && updated.status === 'scheduled') {
      await runCampaign(updated);
    }
  }

  async function runCampaign(campaign: Campaign) {
    const now = new Date().toISOString();
    const started: Campaign = { ...campaign, status: 'running', startedAt: campaign.startedAt ?? now };
    await firebaseService.updateCampaign(campaign.id, { status: 'running', startedAt: started.startedAt });
    campaignRef.current = started;
    setActiveCampaign(started);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? started : c));
    setView('detail');
    runningRef.current = true;
    await callNextLead(started);
  }

  async function callNextLead(campaign: Campaign) {
    // Re-read latest state from ref (may have been paused/cancelled)
    const current = campaignRef.current ?? campaign;
    if (current.status !== 'running' || !runningRef.current) return;

    const done = new Set([...current.completedClientIds, ...current.skippedClientIds]);
    const nextId = current.clientIds.find(id => !done.has(id) && id !== current.currentClientId);

    if (!nextId) {
      await completeCampaign(current);
      return;
    }

    const client = allClients.find(c => c.id === nextId);
    if (!client) {
      // skip unknown client
      const skip: Partial<Campaign> = { skippedClientIds: [...current.skippedClientIds, nextId], currentClientId: null };
      await firebaseService.updateCampaign(current.id, skip);
      const updated = { ...current, ...skip } as Campaign;
      setActiveCampaign(updated);
      await callNextLead(updated);
      return;
    }

    await firebaseService.updateCampaign(current.id, { currentClientId: nextId });
    const withCurrent = { ...current, currentClientId: nextId };
    setActiveCampaign(withCurrent);

    setTranscript([]);
    setCallError(null);
    setCallDuration('00:00');
    setCallMode('dialing');

    try {
      const { callId } = await initiateCall({
        clientName: client.name,
        phoneNumber: client.phoneNumber,
        clientInfo: client.info,
        clientTags: client.tags,
        voiceName: settings?.persona.voiceName ?? 'Kore',
        agentName: settings?.persona.name ?? 'Alex',
        tone: settings?.persona.tone,
        speechPatterns: settings?.persona.speechPatterns,
        focusAreas: settings?.focusAreas,
        systemInstruction: settings?.persona.systemInstruction,
        knowledgeBase: knowledgeDocs.map(d => ({ title: d.title, content: d.content, category: d.category })),
      });

      setActiveCallId(callId);

      wsRef.current = connectTranscriptStream(callId, {
        onConnected: () => setCallMode('dialing'),
        onCallAnswered: () => { setCallMode('active'); startTimer(); },
        onTranscript: line => setTranscript(prev => [...prev, { ...line }]),
        onError: err => setCallError(`Connection: ${err.message}`),
        onCallEnded: async data => {
          stopTimer();
          setCallMode('analyzing');
          await finishLead(callId, client, withCurrent, data.transcript);
        },
      });
    } catch (err: any) {
      setCallError(err instanceof Error ? err.message : String(err));
      setCallMode('idle');
      // skip and continue
      const skip: Partial<Campaign> = {
        skippedClientIds: [...withCurrent.skippedClientIds, nextId],
        currentClientId: null,
      };
      await firebaseService.updateCampaign(withCurrent.id, skip);
      const updated = { ...withCurrent, ...skip } as Campaign;
      setActiveCampaign(updated);
      await wait(3000);
      await callNextLead(updated);
    }
  }

  async function finishLead(
    callId: string,
    client: Client,
    campaign: Campaign,
    lines: TranscriptLine[],
  ) {
    let outcome = 'No Answer';

    if (lines.length === 0) {
      // Voicemail / machine detected — log the attempt and move on, no AI summary needed
      try {
        await firebaseService.addCall({
          clientId: client.id,
          clientName: client.name,
          status: 'completed',
          startTime: new Date().toISOString(),
          outcome: 'No Answer',
          transcript: [],
        });
        await firebaseService.updateClient(client.id, { status: 'no_answer', lastCallId: callId });
      } catch {
        // non-fatal
      }
    } else {
      const transcriptText = lines.map(l => `${l.role}: ${l.text}`).join('\n');
      try {
        const summary = await generateSummary(client.name, transcriptText);
        outcome = summary.outcome ?? 'No Answer';
        await firebaseService.addCall({
          clientId: client.id,
          clientName: client.name,
          status: 'completed',
          startTime: new Date().toISOString(),
          summary: summary.nextSteps,
          sentiment: summary.sentiment,
          outcome: summary.outcome,
          roiProjection: summary.roiProjection,
          upsellOpportunities: summary.upsellOpportunities,
          transcript: lines,
        });
        const statusMap: Record<string, Client['status']> = {
          'Sale Made': 'interested',
          'Follow-up Scheduled': 'follow_up',
          'Not Interested': 'not_interested',
          'No Answer': 'no_answer',
        };
        const newStatus = statusMap[summary.outcome];
        if (newStatus) await firebaseService.updateClient(client.id, { status: newStatus, lastCallId: callId });
      } catch {
        // summary failed — still advance the queue
      }
    }

    const converted = ['Sale Made', 'Follow-up Scheduled'].includes(outcome);
    const nextState: Partial<Campaign> = {
      completedClientIds: [...campaign.completedClientIds, client.id],
      currentClientId: null,
      completedCalls: campaign.completedCalls + 1,
      convertedCalls: campaign.convertedCalls + (converted ? 1 : 0),
    };
    await firebaseService.updateCampaign(campaign.id, nextState);
    const updated = { ...campaign, ...nextState } as Campaign;
    setActiveCampaign(updated);
    setOutcomes(prev => ({ ...prev, [client.id]: outcome }));
    setCallMode('idle');
    setActiveCallId(null);

    // Check paused/cancelled before continuing
    const fresh = await firebaseService.getCampaign(campaign.id);
    if (!fresh || fresh.status !== 'running') {
      setActiveCampaign(fresh ?? updated);
      return;
    }

    await wait(updated.settings.delayBetweenCalls * 1000);
    await callNextLead({ ...updated, status: 'running' });
  }

  async function completeCampaign(campaign: Campaign) {
    runningRef.current = false;
    const now = new Date().toISOString();
    await firebaseService.updateCampaign(campaign.id, { status: 'completed', completedAt: now, currentClientId: null });
    const done = { ...campaign, status: 'completed' as CampaignStatus, completedAt: now, currentClientId: null };
    setActiveCampaign(done);
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? done : c));
  }

  async function handlePause() {
    if (!activeCampaign) return;
    runningRef.current = false;
    await firebaseService.updateCampaign(activeCampaign.id, { status: 'paused' });
    setActiveCampaign(p => p ? { ...p, status: 'paused' } : p);
  }

  async function handleResume() {
    if (!activeCampaign) return;
    runningRef.current = true;
    const updated = { ...activeCampaign, status: 'running' as CampaignStatus };
    await firebaseService.updateCampaign(activeCampaign.id, { status: 'running' });
    campaignRef.current = updated;
    setActiveCampaign(updated);
    await callNextLead(updated);
  }

  async function handleCancel() {
    if (!activeCampaign || !confirm('Cancel this campaign? This cannot be undone.')) return;
    runningRef.current = false;
    wsRef.current?.close();
    if (activeCallId) { try { await endCall(activeCallId); } catch {} }
    await firebaseService.updateCampaign(activeCampaign.id, { status: 'cancelled', currentClientId: null });
    setActiveCampaign(p => p ? { ...p, status: 'cancelled', currentClientId: null } : p);
    setCallMode('idle');
    setActiveCallId(null);
  }

  async function handleEndCurrentCall() {
    if (!activeCallId) return;
    // Do NOT close the WebSocket here — the server emits `call_ended` on this same socket
    // after hanging up Twilio. Closing it first would prevent finishLead from running.
    try { await endCall(activeCallId); } catch {}
  }

  // ── Views ──────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <CampaignList
              campaigns={campaigns}
              onSelect={c => { setActiveCampaign(c); setView('detail'); }}
              onNew={() => setShowCreate(true)}
              onStart={runCampaign}
            />
          </motion.div>
        ) : activeCampaign ? (
          <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <CampaignDetail
              campaign={activeCampaign}
              allClients={allClients}
              transcript={transcript}
              callDuration={callDuration}
              callMode={callMode}
              callError={callError}
              activeCallId={activeCallId}
              outcomes={outcomes}
              transcriptEndRef={transcriptEndRef}
              onBack={() => { setView('list'); loadCampaigns(); }}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onEndCall={handleEndCurrentCall}
              onStart={runCampaign}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <CreateCampaignModal
            allClients={allClients}
            onClose={() => setShowCreate(false)}
            onCreate={async (campaign) => {
              const id = await firebaseService.addCampaign(campaign);
              if (!id) return;
              const created = { ...campaign, id };
              setCampaigns(prev => [created, ...prev]);
              setShowCreate(false);
              if (campaign.scheduledAt === null) {
                await runCampaign(created);
              } else {
                setActiveCampaign(created);
                setView('detail');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Campaign List ──────────────────────────────────────────────────────────────

function CampaignList({
  campaigns, onSelect, onNew, onStart,
}: {
  campaigns: Campaign[];
  onSelect: (c: Campaign) => void;
  onNew: () => void;
  onStart: (c: Campaign) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-sm text-[#8E9299] mt-0.5">Schedule and run automated outbound call batches</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F27D26] text-white rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(242,125,38,0.35)] transition-all"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-16 text-center shadow-sm">
          <ListChecks className="w-12 h-12 text-[#8E9299] mx-auto mb-4 opacity-40" />
          <p className="font-bold text-lg text-[#1a1a1a]">No campaigns yet</p>
          <p className="text-sm text-[#8E9299] mt-1 mb-6">Create your first campaign to start bulk calling leads automatically.</p>
          <button
            onClick={onNew}
            className="px-6 py-2.5 bg-[#F27D26] text-white rounded-xl font-bold text-sm hover:bg-[#e0701f] transition-colors"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const meta = STATUS_META[c.status];
            const pct = c.totalLeads > 0 ? Math.round((c.completedCalls / c.totalLeads) * 100) : 0;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
                className="bg-white border border-[#1a1a1a]/5 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#F27D26]/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 flex items-center justify-center shrink-0">
                    <ListChecks className="w-5 h-5 text-[#F27D26]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold truncate">{c.name}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0", meta.color)}>
                        {c.status === 'running' && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />}
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#8E9299]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalLeads} leads</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{c.completedCalls} done</span>
                      {c.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          {new Date(c.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {c.totalLeads > 0 && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F27D26] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'scheduled' && (
                      <button
                        onClick={e => { e.stopPropagation(); onStart(c); }}
                        className="px-3 py-1.5 bg-[#F27D26] text-white rounded-lg text-xs font-bold hover:bg-[#e0701f] transition-colors"
                      >
                        Start Now
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#8E9299] group-hover:text-[#F27D26] transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Campaign Detail ────────────────────────────────────────────────────────────

function CampaignDetail({
  campaign, allClients, transcript, callDuration, callMode, callError,
  activeCallId, outcomes, transcriptEndRef,
  onBack, onPause, onResume, onCancel, onEndCall, onStart,
}: {
  campaign: Campaign;
  allClients: Client[];
  transcript: Array<TranscriptLine & { time: string }>;
  callDuration: string;
  callMode: 'idle' | 'dialing' | 'active' | 'analyzing';
  callError: string | null;
  activeCallId: string | null;
  outcomes: Record<string, string>;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onEndCall: () => void;
  onStart: (c: Campaign) => void;
}) {
  const meta = STATUS_META[campaign.status];
  const pct = campaign.totalLeads > 0
    ? Math.round(((campaign.completedCalls) / campaign.totalLeads) * 100)
    : 0;

  const currentClient = campaign.currentClientId
    ? allClients.find(c => c.id === campaign.currentClientId)
    : null;

  const done = new Set([...campaign.completedClientIds, ...campaign.skippedClientIds]);
  const pendingIds = campaign.clientIds.filter(id => !done.has(id) && id !== campaign.currentClientId);

  const conversionPct = campaign.completedCalls > 0
    ? Math.round((campaign.convertedCalls / campaign.completedCalls) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#8E9299]">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{campaign.name}</h2>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", meta.color)}>
              {campaign.status === 'running' && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />}
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-[#8E9299] mt-0.5">
            {campaign.completedCalls} / {campaign.totalLeads} calls completed · {conversionPct}% conversion
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'scheduled' && (
            <button onClick={() => onStart(campaign)} className="flex items-center gap-2 px-4 py-2 bg-[#F27D26] text-white rounded-xl text-sm font-bold hover:bg-[#e0701f] transition-colors">
              <Play className="w-4 h-4" /> Start Now
            </button>
          )}
          {campaign.status === 'running' && (
            <button onClick={onPause} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors">
              <Pause className="w-4 h-4" /> Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button onClick={onResume} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
              <Play className="w-4 h-4" /> Resume
            </button>
          )}
          {(campaign.status === 'running' || campaign.status === 'paused') && (
            <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
              <Square className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-[#1a1a1a]/5 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold">Campaign Progress</span>
          <span className="text-sm font-mono font-bold text-[#F27D26]">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#F27D26] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex gap-6 mt-3 text-xs text-[#8E9299]">
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{campaign.completedCalls} completed</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" />{campaign.skippedClientIds.length} skipped</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pendingIds.length} pending</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-[#F27D26]" />{campaign.convertedCalls} converted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Queue list */}
        <div className="lg:col-span-2 bg-white border border-[#1a1a1a]/5 rounded-3xl p-5 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] mb-4">Call Queue</h3>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {/* Current */}
            {currentClient && (
              <div className="flex items-center gap-3 p-3 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#F27D26] flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{currentClient.name}</p>
                  <p className="text-[10px] text-[#8E9299] font-mono">{currentClient.phoneNumber}</p>
                </div>
                <span className="text-[10px] font-bold text-[#F27D26] uppercase animate-pulse">
                  {callMode === 'dialing' ? 'Dialing' : callMode === 'active' ? 'Live' : callMode === 'analyzing' ? 'Analyzing' : 'Current'}
                </span>
              </div>
            )}

            {/* Pending */}
            {pendingIds.slice(0, 20).map((id, i) => {
              const c = allClients.find(cl => cl.id === id);
              if (!c) return null;
              return (
                <div key={id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-500">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-[#8E9299] font-mono">{c.phoneNumber}</p>
                  </div>
                </div>
              );
            })}
            {pendingIds.length > 20 && (
              <p className="text-xs text-center text-[#8E9299] py-2">+{pendingIds.length - 20} more pending</p>
            )}

            {/* Completed */}
            {campaign.completedClientIds.slice(-10).reverse().map(id => {
              const c = allClients.find(cl => cl.id === id);
              if (!c) return null;
              const outcome = outcomes[id] ?? 'Completed';
              return (
                <div key={id} className="flex items-center gap-3 p-3 rounded-xl opacity-60">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate line-through">{c.name}</p>
                  </div>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", OUTCOME_COLORS[outcome] ?? 'bg-gray-100 text-gray-500')}>
                    {outcome}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live call panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active call terminal */}
          <div className="bg-[#151619] text-white rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg">Live Call</h3>
                <p className="text-[#8E9299] text-xs font-mono uppercase mt-0.5">
                  {callMode === 'active' ? 'Voice Link Established' : callMode === 'dialing' ? 'Connecting...' : callMode === 'analyzing' ? 'Generating Insights...' : 'Awaiting Next Call'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", callMode === 'active' ? "bg-green-500 animate-pulse" : "bg-[#8E9299]")} />
                {callMode === 'active' && (
                  <span className="text-lg font-mono font-bold tabular-nums">{callDuration}</span>
                )}
              </div>
            </div>

            {callError && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs">
                {callError}
              </div>
            )}

            {callMode === 'idle' && !currentClient && campaign.status !== 'completed' && (
              <div className="py-10 text-center text-[#8E9299]">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  {campaign.status === 'paused' ? 'Campaign paused — resume to continue calling' : 'Waiting for campaign to start...'}
                </p>
              </div>
            )}

            {campaign.status === 'completed' && (
              <div className="py-10 text-center">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-bold text-lg">Campaign Complete</p>
                <p className="text-[#8E9299] text-sm mt-1">
                  {campaign.completedCalls} calls · {campaign.convertedCalls} converted ({conversionPct(campaign)}% rate)
                </p>
              </div>
            )}

            {callMode === 'dialing' && currentClient && (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#F27D26] animate-spin flex items-center justify-center">
                  <Phone className="w-7 h-7 text-[#F27D26]" />
                </div>
                <p className="font-medium">Calling {currentClient.name}...</p>
                <p className="text-[#8E9299] text-xs font-mono">{currentClient.phoneNumber}</p>
              </div>
            )}

            {callMode === 'analyzing' && (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <Loader2 className="w-12 h-12 text-[#F27D26] animate-spin absolute inset-0" />
                  <Sparkles className="w-6 h-6 text-white absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="font-bold">Generating AI Insights</p>
              </div>
            )}

            {callMode === 'active' && currentClient && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-[#8E9299] uppercase">Speaking With</p>
                    <p className="text-2xl font-medium mt-1">{currentClient.name}</p>
                    <p className="text-[#F27D26] font-mono text-sm mt-1">{currentClient.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={onEndCall}
                    className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-[#8E9299]" /> Live Transcript
              </h3>
              {callMode === 'active' && (
                <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold uppercase">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" /> Live
                </div>
              )}
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {transcript.length === 0 ? (
                <div className="py-10 text-center opacity-20">
                  <History className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Awaiting Audio Stream</p>
                </div>
              ) : (
                transcript.map((msg, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl max-w-[90%]",
                      msg.role === 'agent'
                        ? "bg-[#FDFCFB] border border-[#1a1a1a]/5"
                        : "bg-[#F27D26]/5 border border-[#F27D26]/10 ml-auto flex-row-reverse"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", msg.role === 'agent' ? "bg-[#1a1a1a]" : "bg-[#F27D26]")}>
                      {msg.role === 'agent' ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#8E9299] mb-1">{msg.role} · {msg.time}</p>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function conversionPct(c: Campaign) {
  return c.completedCalls > 0 ? Math.round((c.convertedCalls / c.completedCalls) * 100) : 0;
}

// ── Create Campaign Modal ──────────────────────────────────────────────────────

function CreateCampaignModal({
  allClients, onClose, onCreate,
}: {
  allClients: Client[];
  onClose: () => void;
  onCreate: (c: Omit<Campaign, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending+follow_up');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delay, setDelay] = useState(5);
  const [retryNoAnswer, setRetryNoAnswer] = useState(false);

  const allTags = Array.from(new Set(allClients.flatMap(c => c.tags ?? [])));

  const filtered = allClients.filter(c => {
    const matchName = c.name.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search);
    const matchTag = !tagFilter || (c.tags ?? []).includes(tagFilter);
    const matchStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'pending+follow_up'
      ? c.status === 'pending' || c.status === 'follow_up'
      : c.status === statusFilter;
    return matchName && matchTag && matchStatus;
  });

  function toggleAll() {
    if (filtered.every(c => selected.has(c.id))) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.add(c.id)); return n; });
    }
  }

  function handleSubmit() {
    if (!name.trim() || selected.size === 0) return;
    const ids = allClients.filter(c => selected.has(c.id)).map(c => c.id);
    const campaign: Omit<Campaign, 'id'> = {
      name: name.trim(),
      status: scheduleMode === 'now' ? 'running' : 'scheduled',
      clientIds: ids,
      completedClientIds: [],
      skippedClientIds: [],
      currentClientId: null,
      scheduledAt: scheduleMode === 'later' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      totalLeads: ids.length,
      completedCalls: 0,
      convertedCalls: 0,
      settings: { delayBetweenCalls: delay, retryNoAnswer, retryDelayMinutes: 30 },
    };
    onCreate(campaign);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]/5 shrink-0">
          <h2 className="text-xl font-bold">New Campaign</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#8E9299] mb-2">Campaign Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Q2 Enterprise Outreach"
              className="w-full px-4 py-3 bg-gray-50 border border-[#1a1a1a]/10 rounded-xl focus:ring-2 focus:ring-[#F27D26]/20 outline-none text-sm"
            />
          </div>

          {/* Lead selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">Select Leads</label>
              <span className="text-xs font-bold text-[#F27D26]">{selected.size} selected</span>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9299]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-[#1a1a1a]/10 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#F27D26]/20"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-[#1a1a1a]/10 rounded-lg text-xs outline-none"
              >
                <option value="pending+follow_up">Pending + Follow-up</option>
                <option value="pending">Pending only</option>
                <option value="follow_up">Follow-up only</option>
                <option value="all">All leads</option>
              </select>
              {allTags.length > 0 && (
                <select
                  value={tagFilter ?? ''}
                  onChange={e => setTagFilter(e.target.value || null)}
                  className="px-3 py-2 bg-gray-50 border border-[#1a1a1a]/10 rounded-lg text-xs outline-none"
                >
                  <option value="">All tags</option>
                  {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
                </select>
              )}
            </div>

            {/* Table */}
            <div className="border border-[#1a1a1a]/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-[#1a1a1a]/5">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(c => selected.has(c.id))}
                  onChange={toggleAll}
                  className="accent-[#F27D26]"
                />
                <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wide">
                  {filtered.length} leads shown
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8E9299]">No leads match your filters</div>
                ) : (
                  filtered.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-[#1a1a1a]/3 last:border-0">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => setSelected(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                        className="accent-[#F27D26] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-[#8E9299] font-mono">{c.phoneNumber}</p>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                        c.status === 'pending' ? 'bg-gray-100 text-gray-500' :
                        c.status === 'follow_up' ? 'bg-blue-100 text-blue-600' :
                        c.status === 'interested' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-400'
                      )}>{c.status.replace('_', ' ')}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#8E9299] mb-2">Schedule</label>
            <div className="flex gap-3 mb-3">
              {(['now', 'later'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setScheduleMode(m)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all",
                    scheduleMode === m
                      ? "bg-[#F27D26] text-white border-[#F27D26]"
                      : "bg-gray-50 text-[#8E9299] border-[#1a1a1a]/10 hover:border-[#F27D26]/40"
                  )}
                >
                  {m === 'now' ? 'Start Immediately' : 'Schedule for Later'}
                </button>
              ))}
            </div>
            {scheduleMode === 'later' && (
              <input
                type="datetime-local"
                value={scheduledAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-[#1a1a1a]/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#F27D26]/20"
              />
            )}
          </div>

          {/* Settings */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#8E9299] mb-3">Call Settings</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold">Delay between calls</p>
                  <p className="text-xs text-[#8E9299]">Pause before dialling the next lead</p>
                </div>
                <select
                  value={delay}
                  onChange={e => setDelay(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-[#1a1a1a]/10 rounded-lg text-sm outline-none"
                >
                  {[5, 10, 30, 60].map(s => <option key={s} value={s}>{s}s</option>)}
                </select>
              </div>
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="text-sm font-bold">Retry no-answer leads</p>
                  <p className="text-xs text-[#8E9299]">Re-queue leads that didn't pick up</p>
                </div>
                <input
                  type="checkbox"
                  checked={retryNoAnswer}
                  onChange={e => setRetryNoAnswer(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#1a1a1a]/5 shrink-0 bg-white">
          <p className="text-xs text-[#8E9299]">
            {selected.size} lead{selected.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || selected.size === 0 || (scheduleMode === 'later' && !scheduledAt)}
              className="px-5 py-2.5 bg-[#F27D26] text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e0701f] transition-colors"
            >
              {scheduleMode === 'now' ? 'Create & Start' : 'Schedule Campaign'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
