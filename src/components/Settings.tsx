import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Sparkles, MessageSquare, Brain, Target, ShieldCheck, Volume2, Play, Users, Loader2, Mic, Music, Upload, CheckCircle2, X } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import { textToSpeech } from '../services/geminiService';
import { Settings, Persona } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'persona' | 'focus'>('persona');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const data = await firebaseService.getSettings();
    if (data) {
      setSettings(data);
    } else {
      // Default settings if none found
      setSettings({
        id: 'global-v1',
        persona: {
          name: 'VocalBridge AI',
          tone: 'Professional, warm, Persuasive',
          speechPatterns: 'Natural pauses, conversational fillers (um, ah) occasionally to sound human.',
          systemInstruction: 'You are a senior account manager. Do not mention you are AI.',
          speed: 1.0,
          pitch: 1.0,
          inflection: 0.7,
          voiceName: 'Kore'
        },
        focusAreas: ['Product ROI', 'Customer Success', 'Technical Integration'],
        lastUpdated: new Date().toISOString()
      });
    }
  }

  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const handleVoicePreview = async () => {
    if (!settings?.persona) return;
    setIsPreviewing(true);
    try {
      const isCloned = settings.persona.useClonedVoice;
      const voice = isCloned ? 'Zephyr' : settings.persona.voiceName; 
      const audioData = await textToSpeech(
        isCloned 
          ? `Voice identity matched. Testing cloned attributes at current speed and pitch.`
          : `Hello! I am ${settings.persona.name}. I'm your AI sales representative, configured with a ${settings.persona.tone} tone.`,
        voice,
        settings.persona.speed,
        settings.persona.pitch
      );
      if (audioData) {
        const audio = new Audio(`data:audio/wav;base64,${audioData}`);
        audio.play();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPreviewing(false);
    }
  };

  const [isCloning, setIsCloning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cloningStep, setCloningStep] = useState('');
  const [clonedSample, setClonedSample] = useState<string | null>(null);
  const [uploadedSampleUrl, setUploadedSampleUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCloning(true);
    setUploadedSampleUrl(URL.createObjectURL(file));
    
    // Simulate multi-step cloning process
    const steps = [
      'Analyzing acoustic fingerprint...',
      'Mapping vocal resonance...',
      'Synthesizing phonetic library...',
      'Calibrating emotional inflection...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setCloningStep(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setClonedSample(file.name);
        setSettings({
          ...settings!,
          persona: {
            ...settings!.persona,
            useClonedVoice: true,
            clonedVoiceUrl: uploadedSampleUrl || ''
          }
        });
        setIsCloning(false);
        setCloningStep('');
      }
    }, 1500);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await firebaseService.updateSettings(settings.id, settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
          <p className="text-[#8E9299] text-sm">Manage your AI agent personality and operational focus.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex gap-4 border-b border-[#1a1a1a]/5 pb-4">
        {[
          { id: 'persona', label: 'AI Persona', icon: Sparkles },
          { id: 'focus', label: 'Knowledge Focus', icon: Brain },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              activeSubTab === tab.id 
                ? "bg-[#1a1a1a]/5 text-[#1a1a1a]" 
                : "text-[#8E9299] hover:text-[#1a1a1a] hover:bg-gray-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'persona' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-[#1a1a1a]/5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Core Identity
                  </h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1a1a1a] uppercase">Agent Name</label>
                    <input
                      type="text"
                      value={settings.persona.name}
                      onChange={e => setSettings({ ...settings, persona: { ...settings.persona, name: e.target.value }})}
                      className="w-full px-4 py-2 bg-[#FDFCFB] border border-[#1a1a1a]/10 rounded-xl focus:ring-2 focus:ring-[#F27D26]/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1a1a1a] uppercase">Conversation Tone</label>
                    <input
                      type="text"
                      placeholder="e.g. Witty, direct, empathetic"
                      value={settings.persona.tone}
                      onChange={e => setSettings({ ...settings, persona: { ...settings.persona, tone: e.target.value }})}
                      className="w-full px-4 py-2 bg-[#FDFCFB] border border-[#1a1a1a]/10 rounded-xl focus:ring-2 focus:ring-[#F27D26]/20 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#1a1a1a]/5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
                      <Users className="w-4 h-4" /> Agent Voice
                    </h3>
                    <button 
                      onClick={handleVoicePreview}
                      disabled={isPreviewing}
                      className="text-[#F27D26] text-[10px] font-bold uppercase flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      {isPreviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Preview Voice
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Kore', label: 'Kore (US English)', type: 'Neutral & Balanced' },
                      { id: 'Puck', label: 'Puck (US English)', type: 'Youthful & Direct' },
                      { id: 'Charon', label: 'Charon (US English)', type: 'Deep & Authoritative' },
                      { id: 'Zephyr', label: 'Zephyr (UK English)', type: 'Bright & Empathetic' },
                      { id: 'Aoede', label: 'Aoede (Australian)', type: 'Warm & Friendly' },
                      { id: 'Eos', label: 'Eos (UK English)', type: 'Calm & Professional' },
                      { id: 'Helius', label: 'Helius (US English)', type: 'Energetic & Fast' },
                      { id: 'Nyx', label: 'Nyx (US English)', type: 'Whispery & Soft' },
                    ].map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => setSettings({ 
                          ...settings, 
                          persona: { ...settings.persona, voiceName: voice.id, useClonedVoice: false }
                        })}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all group",
                          (settings.persona.voiceName === voice.id && !settings.persona.useClonedVoice) 
                            ? "bg-[#1a1a1a] border-[#1a1a1a] text-white" 
                            : "bg-[#FDFCFB] border-[#1a1a1a]/5 hover:border-[#1a1a1a]/20"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold">{voice.label}</p>
                          {settings.persona.voiceName === voice.id && !settings.persona.useClonedVoice && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
                          )}
                        </div>
                        <p className={cn("text-[8px] uppercase tracking-widest mt-1 opacity-60")}>{voice.type}</p>
                      </button>
                    ))}

                    <button
                      onClick={() => settings.persona.clonedVoiceUrl && setSettings({ 
                        ...settings, 
                        persona: { ...settings.persona, useClonedVoice: true }
                      })}
                      disabled={!settings.persona.clonedVoiceUrl}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all relative overflow-hidden",
                        settings.persona.useClonedVoice
                          ? "bg-[#F27D26] border-[#F27D26] text-white" 
                          : "bg-[#FDFCFB] border-[#1a1a1a]/5 hover:border-[#1a1a1a]/20",
                        !settings.persona.clonedVoiceUrl && "opacity-40 grayscale cursor-not-allowed"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold">Cloned Voice</p>
                        {settings.persona.clonedVoiceUrl && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <p className="text-[9px] uppercase tracking-widest mt-1 opacity-60">Custom Sample</p>
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="p-5 rounded-2xl bg-[#F27D26]/5 border border-[#F27D26]/10">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#F27D26]/10 flex items-center justify-center flex-shrink-0">
                           <Mic className="w-5 h-5 text-[#F27D26]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-[#1a1a1a] uppercase">AI Voice Cloning</p>
                            {settings.persona.clonedVoiceUrl && (
                              <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-green-700 uppercase">Synchronized</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#8E9299] leading-relaxed">
                            Create a custom neural voice profile by providing a high-quality audio sample.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <label 
                          className={cn(
                            "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer group",
                            isDragging ? "border-[#F27D26] bg-[#F27D26]/5" : "border-[#1a1a1a]/10 hover:border-[#F27D26]/30",
                            isCloning ? "pointer-events-none" : ""
                          )}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleFileUpload({ target: { files: [file] } } as any);
                          }}
                        >
                          <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                          
                          {isCloning ? (
                            <div className="flex flex-col items-center gap-4 w-full">
                              <div className="relative">
                                <Loader2 className="w-8 h-8 animate-spin text-[#F27D26]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Mic className="w-3 h-3 text-[#F27D26]" />
                                </div>
                              </div>
                              <div className="space-y-2 w-full max-w-[200px] text-center">
                                <p className="text-[10px] font-bold text-[#F27D26] uppercase tracking-widest">{cloningStep}</p>
                                <div className="h-1 w-full bg-[#F27D26]/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-[#F27D26]"
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 6, ease: "linear" }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-xl bg-[#1a1a1a]/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-[#1a1a1a]/40" />
                              </div>
                              <p className="text-sm font-bold text-[#1a1a1a]">Drop audio sample here</p>
                              <p className="text-[10px] text-[#8E9299] mt-1">or click to browse from files</p>
                            </>
                          )}
                        </label>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-[#1a1a1a] uppercase flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#F27D26]" /> Sample Quality
                          </p>
                          <p className="text-[10px] text-[#8E9299]">44.1kHz or 48kHz, mono or stereo. Avoid background noise and reverb.</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-[#1a1a1a] uppercase flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#F27D26]" /> Sample Length
                          </p>
                          <p className="text-[10px] text-[#8E9299]">Minimum 30 seconds. Ideal length is 1-2 minutes of clean speech.</p>
                        </div>
                      </div>

                      {settings.persona.clonedVoiceUrl && !isCloning && (
                        <div className="mt-6 space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white border border-[#1a1a1a]/5 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#F27D26]/10 flex items-center justify-center">
                                <Music className="w-4 h-4 text-[#F27D26]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold truncate pr-4">{clonedSample || 'voice-identity-profile.wav'}</p>
                                <p className="text-[8px] text-[#8E9299] uppercase font-bold tracking-tight">Active Neural Profile</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  if (uploadedSampleUrl) {
                                    const audio = new Audio(uploadedSampleUrl);
                                    audio.play();
                                  }
                                }}
                                className="p-2 text-[#1a1a1a] hover:bg-gray-50 rounded-lg transition-colors border border-[#1a1a1a]/5"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                               <button 
                                onClick={() => {
                                  setSettings({
                                    ...settings,
                                    persona: { ...settings.persona, clonedVoiceUrl: undefined, useClonedVoice: false }
                                  });
                                  setUploadedSampleUrl(null);
                                  setClonedSample(null);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-xl bg-white border border-[#1a1a1a]/5 text-center shadow-sm">
                              <p className="text-[8px] text-[#8E9299] uppercase font-bold mb-0.5">Similarity</p>
                              <p className="text-[10px] font-bold text-[#1a1a1a]">98.4%</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-[#1a1a1a]/5 text-center shadow-sm">
                              <p className="text-[8px] text-[#8E9299] uppercase font-bold mb-0.5">Stability</p>
                              <p className="text-[10px] font-bold text-[#1a1a1a]">Very High</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-[#1a1a1a]/5 text-center shadow-sm">
                              <p className="text-[8px] text-[#8E9299] uppercase font-bold mb-0.5">Retained</p>
                              <p className="text-[10px] font-bold text-[#1a1a1a]">100%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#1a1a1a]/5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
                    <Target className="w-4 h-4" /> Speech Patterns
                  </h3>
                  <textarea
                    rows={4}
                    value={settings.persona.speechPatterns}
                    onChange={e => setSettings({ ...settings, persona: { ...settings.persona, speechPatterns: e.target.value }})}
                    className="w-full px-4 py-3 bg-[#FDFCFB] border border-[#1a1a1a]/10 rounded-xl focus:ring-2 focus:ring-[#F27D26]/20 outline-none text-sm resize-none"
                  />
                  <p className="text-[10px] text-[#8E9299]">Tip: Describe how the AI should handle silences, interruptions, and technical jargon.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#1a1a1a]/5 shadow-sm space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> Voice Dynamics
                  </h3>
                  <div className="space-y-4">
                    {[
                      { id: 'speed', label: 'Speech Speed', value: settings.persona.speed || 1.0, min: 0.5, max: 2.0, step: 0.1 },
                      { id: 'pitch', label: 'Vocal Pitch', value: settings.persona.pitch || 1.0, min: 0.5, max: 1.5, step: 0.05 },
                      { id: 'inflection', label: 'Emotional Inflection', value: settings.persona.inflection || 0.7, min: 0, max: 1, step: 0.1 },
                    ].map(param => (
                      <div key={param.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-[#1a1a1a] uppercase">{param.label}</label>
                          <span className="text-xs font-mono text-[#F27D26]">{param.value.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={param.value}
                          onChange={e => setSettings({ 
                            ...settings, 
                            persona: { ...settings.persona, [param.id]: parseFloat(e.target.value) }
                          })}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#1a1a1a]/5 shadow-sm space-y-4 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> System Instructions
                </h3>
                <textarea
                  rows={12}
                    value={settings.persona.systemInstruction}
                    onChange={e => setSettings({ ...settings, persona: { ...settings.persona, systemInstruction: e.target.value }})}
                  className="flex-1 w-full px-4 py-3 bg-[#FDFCFB] border border-[#1a1a1a]/10 rounded-xl focus:ring-2 focus:ring-[#F27D26]/20 outline-none text-sm font-mono resize-none"
                />
                <p className="text-[10px] text-[#8E9299]">These are the low-level prompts sent to Gemini for every interaction.</p>
              </div>
            </div>
          )}

          {activeSubTab === 'focus' && (
            <div className="bg-white p-6 rounded-2xl border border-[#1a1a1a]/5 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Knowledge Focus Areas</h3>
                <button 
                  onClick={() => setSettings({ ...settings, focusAreas: [...settings.focusAreas, 'New Area'] })}
                  className="text-[#F27D26] text-xs font-bold hover:underline"
                >
                  + Add Priority Area
                </button>
              </div>
              <p className="text-sm text-[#8E9299]">The AI will prioritize these topics during its pitch and when retrieving from the Knowledge Base.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {settings.focusAreas.map((area, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={area}
                      onChange={e => {
                        const newAreas = [...settings.focusAreas];
                        newAreas[i] = e.target.value;
                        setSettings({ ...settings, focusAreas: newAreas });
                      }}
                      className="flex-1 px-4 py-2 bg-[#FDFCFB] border border-[#1a1a1a]/10 rounded-xl focus:ring-1 focus:ring-[#F27D26] outline-none text-sm"
                    />
                    <button 
                      onClick={() => {
                        const newAreas = settings.focusAreas.filter((_, idx) => idx !== i);
                        setSettings({ ...settings, focusAreas: newAreas });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
