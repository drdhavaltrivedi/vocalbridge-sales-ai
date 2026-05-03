import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen, ChevronRight, ArrowRight, Zap, Users, PhoneCall,
  BookMarked, Settings, HelpCircle, Upload, Link as LinkIcon,
  Brain, BarChart2, CheckCircle2, AlertCircle, Menu, X
} from 'lucide-react';
import { cn } from '../lib/utils';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Zap },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'clients', label: 'Managing Leads', icon: Users },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookMarked },
  { id: 'call-monitor', label: 'Call Monitor', icon: PhoneCall },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-20 scroll-mt-24">
      <h2 className="text-2xl font-black mb-6 pb-4 border-b border-[#1a1a1a]/10 tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5 p-6 bg-white border border-[#1a1a1a]/5 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 flex items-center justify-center text-[#F27D26] font-black text-sm flex-shrink-0">{num}</div>
      <div>
        <h4 className="font-bold mb-1">{title}</h4>
        <p className="text-sm text-[#8E9299] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: 'tip' | 'warning' | 'note'; children: React.ReactNode }) {
  const styles = {
    tip: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    note: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons = { tip: CheckCircle2, warning: AlertCircle, note: BookOpen };
  const Icon = icons[type];
  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border text-sm leading-relaxed my-4', styles[type])}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans">
      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#1a1a1a]/5 h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="VocalBridge" className="w-7 h-7 object-contain rounded-lg" />
              <span className="font-bold tracking-tight">VocalBridge AI</span>
            </Link>
            <span className="hidden md:block text-[#8E9299] text-sm">/</span>
            <span className="hidden md:block text-sm font-medium text-[#8E9299]">Documentation</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-[#8E9299] hover:text-[#1a1a1a] transition-colors hidden md:block">← Back to Home</Link>
            <Link to="/login" className="px-4 py-2 bg-[#F27D26] text-[#1a1a1a] rounded-xl text-sm font-bold hover:opacity-90 transition-all">
              Try It Free →
            </Link>
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden p-2">
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 pt-16 bg-white md:hidden">
          <nav className="p-6 space-y-1">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <a key={s.id} href={`#${s.id}`} onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#8E9299] hover:bg-gray-50">
                  <Icon className="w-4 h-4" />{s.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}

      <div className="max-w-7xl mx-auto pt-16 flex">
        {/* Sidebar TOC */}
        <aside className="hidden md:block w-64 flex-shrink-0 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto py-10 pr-6 border-r border-[#1a1a1a]/5">
          <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest px-3 mb-4">On This Page</p>
          <nav className="space-y-1">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <a key={s.id} href={`#${s.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive ? 'bg-[#1a1a1a] text-white' : 'text-[#8E9299] hover:bg-gray-100 hover:text-[#1a1a1a]'
                  )}>
                  <Icon className="w-4 h-4" />
                  {s.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-10 p-4 bg-[#F27D26]/5 rounded-2xl border border-[#F27D26]/10">
            <p className="text-xs font-bold mb-2">Ready to start?</p>
            <p className="text-[11px] text-[#8E9299] mb-3">Claim your early access and be live in under 2 minutes.</p>
            <Link to="/login" className="block text-center text-[11px] font-bold py-2 bg-[#F27D26] text-[#1a1a1a] rounded-lg hover:opacity-90 transition-all">
              Get Early Access →
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-10 px-6 md:px-12 max-w-3xl">

          {/* ── Getting Started ── */}
          <Section id="getting-started" title="Getting Started">
            <p className="text-[#8E9299] leading-relaxed mb-8">
              VocalBridge is a cloud-based AI sales platform. You don't need to install anything — just log in and you're ready to run your first AI-powered sales campaign in under 5 minutes.
            </p>
            <div className="space-y-4">
              <StepCard num="1" title="Create Your Account"
                desc="Visit vocalbridge-sales-ai.vercel.app and click 'Sign in with Google'. Your account is created automatically — no forms to fill out." />
              <StepCard num="2" title="Import Your First Leads"
                desc="Go to the Clients tab. Click 'New Lead' to add one manually, or 'Import CSV' to bulk-upload your prospect list. CSV format: name, phone, email, info, tags." />
              <StepCard num="3" title="Train Your AI Agent"
                desc="Open the Knowledge Base. Upload your product brochure, pricing sheet, or FAQ document. Your AI agent will instantly learn how to answer client questions." />
              <StepCard num="4" title="Monitor Your Results"
                desc="The Dashboard shows real-time stats — calls made, leads converted, sentiment scores, and ROI projections. Check it daily to track progress." />
            </div>
            <Callout type="tip">
              <strong>Pro Tip:</strong> The more documents you add to the Knowledge Base, the smarter your AI agent becomes. Start with your top 3 objection-handling docs.
            </Callout>
          </Section>

          {/* ── Dashboard ── */}
          <Section id="dashboard" title="Dashboard">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              Your command center. The Dashboard loads live data from your Firestore database the moment you log in, giving you an always-current view of your sales performance.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { title: 'Total Leads', desc: 'The number of clients in your database.' },
                { title: 'Converted', desc: 'Leads whose status has been set to "Interested".' },
                { title: 'Total Calls', desc: 'Logged calls from the Call Monitor module.' },
                { title: 'Lead Conversion Chart', desc: 'Pie chart breaking down lead statuses in real-time.' },
              ].map(c => (
                <div key={c.title} className="p-4 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                  <h4 className="font-bold text-sm mb-1">{c.title}</h4>
                  <p className="text-xs text-[#8E9299]">{c.desc}</p>
                </div>
              ))}
            </div>
            <Callout type="note">
              Dashboard stats update each time you navigate to it. They reflect the current state of your Firestore collections — no refresh needed.
            </Callout>
          </Section>

          {/* ── Clients ── */}
          <Section id="clients" title="Managing Leads">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              The Clients page is your lead management hub. Every prospect your AI agent will contact lives here.
            </p>
            <h3 className="text-lg font-bold mb-4">Adding a Single Lead</h3>
            <div className="space-y-3 mb-8">
              <p className="text-sm text-[#8E9299]">Click the orange <strong className="text-[#1a1a1a]">"New Lead"</strong> button in the top-right. A modal will open asking for:</p>
              <ul className="space-y-2 text-sm text-[#8E9299] list-none">
                {[
                  ['Full Name', 'Client\'s display name'],
                  ['Phone Number', 'E.g. +1 (555) 000-0000 — used for AI calls'],
                  ['Email Address', 'Optional — for follow-up emails'],
                  ['Company / Info', 'Any notes about the client or their company'],
                  ['Tags', 'Comma-separated, e.g. "hot-lead, enterprise, q2-campaign"'],
                ].map(([field, note]) => (
                  <li key={field} className="flex gap-3 items-start">
                    <ChevronRight className="w-4 h-4 text-[#F27D26] flex-shrink-0 mt-0.5" />
                    <span><strong className="text-[#1a1a1a]">{field}</strong> — {note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <h3 className="text-lg font-bold mb-4">Bulk Import via CSV</h3>
            <p className="text-sm text-[#8E9299] mb-4">Click <strong className="text-[#1a1a1a]">"Import CSV"</strong> and drop your file. Your CSV must have these column headers:</p>
            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-6 font-mono text-xs text-green-400 overflow-x-auto">
              name, phone, email, info, tags
            </div>
            <Callout type="warning">
              Phone numbers in CSV should include country code (e.g., +15550001234). Numbers without country code may fail during AI calls.
            </Callout>
            <h3 className="text-lg font-bold mb-4 mt-8">Lead Statuses</h3>
            <div className="space-y-2">
              {[
                ['pending', 'bg-yellow-100 text-yellow-700', 'Default status for all new leads. Not yet contacted.'],
                ['interested', 'bg-green-100 text-green-700', 'Lead expressed interest. Marked for follow-up or close.'],
                ['follow_up', 'bg-blue-100 text-blue-700', 'Requested a callback or more information.'],
                ['not_interested', 'bg-gray-100 text-gray-700', 'Declined. Will not be called again automatically.'],
              ].map(([status, style, desc]) => (
                <div key={status} className="flex items-center gap-4 p-3 bg-white border border-[#1a1a1a]/5 rounded-xl">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style}`}>{status.replace('_', ' ')}</span>
                  <p className="text-sm text-[#8E9299]">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Knowledge Base ── */}
          <Section id="knowledge-base" title="Knowledge Base">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              The Knowledge Base is what makes your AI agent intelligent. Without it, your agent will only have basic conversational ability. With it, it becomes a domain expert.
            </p>
            <h3 className="text-lg font-bold mb-4">Uploading a PDF or Text File</h3>
            <div className="space-y-4 mb-8">
              <StepCard num="1" title="Go to Knowledge Base" desc="Click 'Knowledge Base' in the sidebar." />
              <StepCard num="2" title="Drop Your File" desc="Drag and drop a PDF or .txt file into the upload area, or click to browse. Supported: PDF, TXT." />
              <StepCard num="3" title="Gemini Processes It" desc="The AI reads your document and creates a structured knowledge article. This takes 5–15 seconds." />
              <StepCard num="4" title="Review and Save" desc="The processed content appears in the editor. Edit the title, pick a category, and click Save." />
            </div>
            <Callout type="tip">
              Upload your product one-pager, pricing sheet, and top 5 FAQs first. These cover 80% of client questions during a sales call.
            </Callout>
            <h3 className="text-lg font-bold mb-4 mt-8">Adding a Web URL</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              Paste any URL (e.g., your pricing page, a competitor comparison page, or your about page) into the URL field and press Enter. The AI will summarize and structure the content into a knowledge article.
            </p>
            <Callout type="note">
              URL scraping currently simulates extraction. For live website scraping in production, a server-side proxy is recommended.
            </Callout>
          </Section>

          {/* ── Call Monitor ── */}
          <Section id="call-monitor" title="Call Monitor">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              Every call your AI agent makes is logged here with a full transcript, AI-generated summary, sentiment score, and outcome classification.
            </p>
            <div className="space-y-4 mb-8">
              {[
                { title: 'Transcript', desc: 'Full word-for-word record of what the agent and client said during the call.' },
                { title: 'AI Summary', desc: 'Gemini automatically writes a concise summary of the call outcome and key points raised.' },
                { title: 'Sentiment', desc: 'Classified as Positive, Neutral, or Negative based on the client\'s language and tone.' },
                { title: 'Outcome', desc: 'One of: Sale Made, Follow-up Scheduled, Not Interested, No Answer.' },
                { title: 'ROI Projection', desc: 'Gemini estimates potential revenue based on the conversation context.' },
                { title: 'Upsell Opportunities', desc: 'AI-identified adjacent products or services the client might be interested in.' },
              ].map(c => (
                <div key={c.title} className="flex gap-4 p-4 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 text-[#F27D26] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">{c.title}</h4>
                    <p className="text-xs text-[#8E9299] mt-0.5">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Settings ── */}
          <Section id="settings" title="Settings">
            <p className="text-[#8E9299] leading-relaxed mb-6">Configure your AI agent's personality, voice, and behavior.</p>
            <div className="space-y-4">
              {[
                { title: 'Agent Name & Persona', desc: 'Give your AI agent a name. It will use this name when introducing itself to clients.' },
                { title: 'Voice Selection', desc: 'Choose from multiple Gemini TTS voices. Each has a different tone — some warmer, some more professional.' },
                { title: 'Call Speed & Pitch', desc: 'Adjust how fast or slow your agent speaks, and fine-tune the pitch to match your brand.' },
                { title: 'System Instructions', desc: 'Advanced: Customize the core prompt that drives your agent. Add industry-specific language, specific CTAs, or hard rules.' },
              ].map(c => (
                <div key={c.title} className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                  <h4 className="font-bold mb-1">{c.title}</h4>
                  <p className="text-sm text-[#8E9299]">{c.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── FAQ ── */}
          <Section id="faq" title="FAQ">
            <div className="space-y-4">
              {[
                {
                  q: 'Is the AI agent voice detectable as a robot?',
                  a: 'No. VocalBridge uses Google\'s Gemini TTS which produces natural, human-sounding speech. Your agent is configured to never reveal it\'s an AI unless directly and explicitly asked.'
                },
                {
                  q: 'What happens when a lead asks to speak to a human?',
                  a: 'The agent will politely note the request and schedule a follow-up call. You\'ll see this in the Call Monitor as a "Follow-up Scheduled" outcome.'
                },
                {
                  q: 'How many calls can my agent make simultaneously?',
                  a: 'The Starter plan supports sequential calls. Growth and Enterprise plans unlock concurrent call capabilities. Check your plan limits in the Settings page.'
                },
                {
                  q: 'Is my data secure?',
                  a: 'Yes. All data is stored in Google Firebase with role-based Firestore security rules. Your API keys are stored as environment variables and never exposed client-side.'
                },
                {
                  q: 'Can I cancel my early access plan?',
                  a: 'Yes, anytime. There are no lock-in contracts. If you cancel, your account and data remain accessible until the end of your billing period.'
                },
              ].map((item, i) => (
                <details key={i} className="group p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl cursor-pointer">
                  <summary className="font-bold text-sm list-none flex items-center justify-between">
                    {item.q}
                    <ChevronRight className="w-4 h-4 text-[#8E9299] group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="mt-4 text-sm text-[#8E9299] leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </Section>

          {/* Bottom CTA */}
          <div className="mt-10 p-8 bg-[#1a1a1a] rounded-3xl text-center">
            <h3 className="text-2xl font-black text-white mb-3">Ready to Start?</h3>
            <p className="text-gray-400 text-sm mb-6">Join the teams already using VocalBridge to automate their sales outreach.</p>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#F27D26] text-[#1a1a1a] rounded-xl font-bold hover:opacity-90 transition-all">
              Claim Early Access <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
