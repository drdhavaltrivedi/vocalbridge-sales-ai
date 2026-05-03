import React, { useState, useEffect } from 'react';
import { Phone, Play, Pause, Square, Mic, Volume2, History, Bot, User, Sparkles, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateSummary } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';

export default function CallMonitor() {
  const [isDialing, setIsDialing] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const startDemoCall = () => {
    setIsDialing(true);
    setSummary(null);
    setTimeout(() => {
      setIsDialing(false);
      const startTime = new Date().toLocaleTimeString();
      setActiveCall({
        id: 'call_demo_' + Date.now().toString().slice(-4),
        client: 'John Doe',
        phone: '+1 (555) 123-4567',
        duration: '00:00',
        status: 'Ongoing',
        transcript: []
      });
      simulateTranscription();
    }, 1500);
  };

  const simulateTranscription = () => {
    const lines = [
      { role: 'agent', text: "Hello John, this is VocalBridge AI. How are you today?" },
      { role: 'customer', text: "Hey, I'm good. What's this about?" },
      { role: 'agent', text: "I'm calling to discuss our new cloud automation suite. I see you've been looking for a more scalable solution." },
      { role: 'customer', text: "Yeah, but honestly, your pricing seems 20% higher than what we have now." },
      { role: 'agent', text: "I understand the price concern. However, our downtime reduction saves typical firms $2k monthly. Shall we look at the ROI?" },
      { role: 'customer', text: "Hmm, that's interesting. Can you send over a detailed doc?" },
      { role: 'agent', text: "Absolutely. I'll include the case study for similar-sized agencies. Let's talk again Thursday?" },
      { role: 'customer', text: "Sure, Thursday works. Around 2 PM." }
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (count < lines.length) {
        setActiveCall((prev: any) => ({
          ...prev,
          transcript: [...prev.transcript, { ...lines[count], time: new Date().toLocaleTimeString() }],
          duration: `00:${(count * 5).toString().padStart(2, '0')}`
        }));
        count++;
      } else {
        clearInterval(interval);
      }
    }, 3000);
  };

  const OUTCOMES = ['Sale Made', 'Follow-up Scheduled', 'Not Interested', 'No Answer'];

  const endCall = async () => {
    if (!activeCall) return;
    setIsGeneratingSummary(true);
    const transcriptText = activeCall.transcript.map((t: any) => `${t.role}: ${t.text}`).join('\n');
    
    try {
      const aiSummary = await generateSummary(activeCall.client, transcriptText);
      setSummary(aiSummary);
      
      // Save to Firebase (Initial auto-save)
      await firebaseService.addCall({
        clientId: 'demo_client',
        clientName: activeCall.client,
        status: 'completed',
        startTime: new Date().toISOString(),
        summary: aiSummary.outcome,
        sentiment: aiSummary.sentiment,
        outcome: aiSummary.outcome,
        roiProjection: aiSummary.roiProjection,
        upsellOpportunities: aiSummary.upsellOpportunities,
        transcript: activeCall.transcript
      });

    } catch (error) {
      console.error("Summary generation failed:", error);
    } finally {
      setIsGeneratingSummary(false);
      setActiveCall(null);
    }
  };

  const handleOutcomeChange = async (newOutcome: string) => {
    if (!summary) return;
    setSummary({ ...summary, outcome: newOutcome });
    // In a real app, we would update the DB here too, but for demo we just update local state
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Pane: Active Call / Dialer */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#151619] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <div className="w-32 h-32 border-2 border-dashed border-white rounded-full animate-spin-slow" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Active Call Terminal</h2>
                <p className="text-[#8E9299] text-xs font-mono uppercase mt-1">
                  {summary ? 'Call Analyzed' : activeCall ? 'Voice Link Established' : 'Operational'}
                </p>
              </div>
              <div className="flex gap-2">
                <div className={cn("w-2 h-2 rounded-full", activeCall ? "bg-green-500 animate-pulse" : "bg-[#8E9299]")} />
                <div className="w-2 h-2 rounded-full bg-[#8E9299]" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeCall ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-[#8E9299] uppercase">Recipient</p>
                      <p className="text-3xl font-medium mt-1">{activeCall.client}</p>
                      <p className="text-[#F27D26] font-mono mt-2 tracking-widest">{activeCall.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-[#8E9299] uppercase">Secure Duration</p>
                      <p className="text-4xl font-mono font-bold mt-1 tabular-nums">{activeCall.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6 py-8 border-y border-white/5">
                    <button className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                      <Mic className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={endCall}
                      className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-[0_0_40px_rgba(239,68,68,0.3)]"
                    >
                      <Phone className="w-8 h-8 rotate-[135deg]" />
                    </button>
                    <button className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                      <Volume2 className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              ) : isGeneratingSummary ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 relative">
                    <Loader2 className="w-16 h-16 text-[#F27D26] animate-spin absolute inset-0" />
                    <Sparkles className="w-8 h-8 text-white absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Generating AI Insights</h3>
                    <p className="text-[#8E9299] text-xs font-mono mt-2 uppercase tracking-widest">Processing transcript & sentiment...</p>
                  </div>
                </div>
              ) : summary ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <p className="text-[10px] font-bold text-[#8E9299] uppercase mb-1">Sentiment</p>
                         <div className="flex items-center gap-2">
                            {summary.sentiment === 'Positive' ? <CheckCircle className="text-green-500 w-4 h-4" /> : <AlertTriangle className="text-yellow-500 w-4 h-4" />}
                            <p className="font-bold">{summary.sentiment}</p>
                         </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <p className="text-[10px] font-bold text-[#8E9299] uppercase mb-2">Outcome</p>
                         <div className="flex flex-wrap gap-2">
                           {OUTCOMES.map(o => (
                             <button
                               key={o}
                               onClick={() => handleOutcomeChange(o)}
                               className={cn(
                                 "px-3 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                 summary.outcome === o 
                                   ? "bg-[#F27D26] border-[#F27D26] text-[#1a1a1a]" 
                                   : "bg-white/5 border-white/10 text-[#8E9299] hover:border-white/30"
                               )}
                             >
                               {o}
                             </button>
                           ))}
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-bold text-[#8E9299] uppercase">ROI Projection</p>
                        <p className="text-xs opacity-80 leading-relaxed">{summary.roiProjection || 'Calculating potential savings and revenue impact based on discussion...'}</p>
                     </div>
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-bold text-[#8E9299] uppercase">Upsell Opportunities</p>
                        <div className="flex flex-wrap gap-2">
                          {(summary.upsellOpportunities || ['Enterprise Suite', 'Priority Support']).map((upsell: string, i: number) => (
                            <span key={i} className="text-[10px] bg-[#F27D26]/20 text-[#F27D26] px-2 py-0.5 rounded-full font-bold">
                              {upsell}
                            </span>
                          ))}
                        </div>
                     </div>
                   </div>

                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F27D26]/10 flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-[#F27D26]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Call Recording</p>
                            <p className="text-[10px] text-[#8E9299]">vbridge-rec-{summary.id || 'demo'}.wav</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setIsPlaying(!isPlaying)}
                             className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                           >
                             {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                           </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden cursor-pointer group relative">
                           <motion.div 
                             className="h-full bg-[#F27D26] relative" 
                             initial={{ width: 0 }}
                             animate={{ width: isPlaying ? '65%' : '0%' }}
                             transition={{ duration: isPlaying ? 10 : 0, ease: 'linear' }}
                           />
                           <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono opacity-50 uppercase">
                           <span>{isPlaying ? '0:42' : '0:00'}</span>
                           <span>1:24</span>
                        </div>
                      </div>
                   </div>
                   
                   <button onClick={() => setSummary(null)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                      Acknowledge & Close
                   </button>
                </motion.div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                  <div className={cn(
                    "w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-500",
                    isDialing ? "border-[#F27D26] animate-spin" : "border-white/10"
                  )}>
                    <Phone className={cn("w-10 h-10 transition-colors", isDialing ? "text-[#F27D26]" : "text-white/20")} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-medium tracking-tight">System Ready to Connect</h3>
                    <p className="text-[#8E9299] text-xs font-mono lowercase max-w-sm">Awaiting campaign execution or manual lead override.</p>
                  </div>
                  <button onClick={startDemoCall} disabled={isDialing} className="px-8 py-3 bg-[#F27D26] text-[#1a1a1a] rounded-full font-bold hover:shadow-[0_0_20px_rgba(242,125,38,0.4)] transition-all">
                    {isDialing ? 'Processing Signal...' : 'Initiate Secure Audio Stream'}
                  </button>
                </div>
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
            {activeCall && <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold uppercase"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" /> Live Feed</div>}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
            {(activeCall?.transcript || []).map((msg: any, i: number) => {
              const isLast = i === (activeCall?.transcript?.length - 1);
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex gap-4 p-4 rounded-2xl max-w-[90%] relative group",
                    msg.role === 'agent' ? "bg-[#FDFCFB] border border-[#1a1a1a]/5 self-start" : "bg-[#F27D26]/5 border border-[#F27D26]/10 self-end flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm relative",
                    msg.role === 'agent' ? "bg-[#1a1a1a]" : "bg-[#F27D26]"
                  )}>
                    {msg.role === 'agent' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-[#1a1a1a]" />}
                    {isLast && (
                       <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-25" />
                    )}
                  </div>
                  <div className={msg.role === 'customer' ? 'text-right' : ''}>
                    <div className="flex items-center gap-2 mb-1 justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299]">{msg.role}</p>
                      <span className="text-[10px] font-mono text-[#8E9299] opacity-50 bg-gray-100 px-1 rounded">+{msg.time?.split(':')[2] || '00'}s</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#1a1a1a]">{msg.text}</p>
                  </div>
                </motion.div>
              );
            })}
            {!activeCall && !summary && (
              <div className="h-full flex items-center justify-center opacity-20 flex-col gap-4 py-20 grayscale">
                <History className="w-12 h-12" />
                <p className="text-sm font-bold uppercase tracking-widest">Awaiting Audio Stream</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Intelligence */}
      <div className="space-y-6">
        <div className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#F27D26]/5 rounded-full blur-2xl" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F27D26]" />
            Live Suggestions
          </h3>
          <div className="space-y-3">
             {activeCall?.transcript?.some((t: any) => t.text.includes('pricing')) ? (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-2xl">
                   <p className="text-xs font-bold text-[#F27D26] mb-1">Knowledge Retrieval</p>
                   <p className="text-[11px] leading-tight text-[#1a1a1a]">Customer asked about pricing. Standard TechCloud v4 is $499/mo, Enterprise is custom.</p>
                </motion.div>
             ) : (
               <p className="text-xs text-[#8E9299] italic">AI is listening for knowledge triggers...</p>
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
                <span className="text-xs font-bold text-green-500 uppercase">Kore-3.1</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-sm opacity-60">Latency</span>
                <span className="text-xs font-mono">142ms</span>
             </div>
             <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#F27D26] w-3/4" />
             </div>
             <p className="text-[10px] text-[#8E9299] text-center uppercase tracking-widest mt-4">Optimized for Enterprise Sales</p>
          </div>
        </div>
      </div>
    </div>
  );
}
