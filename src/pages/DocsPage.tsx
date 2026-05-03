import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen, ChevronRight, ArrowRight, Zap, Users, PhoneCall,
  BookMarked, Settings, HelpCircle, Upload, Link as LinkIcon,
  Brain, BarChart2, CheckCircle2, AlertCircle, Menu, X,
  Shield, Wrench, Mic, FileText, Tag, Sparkles, Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Zap },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'clients', label: 'Managing Leads', icon: Users },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookMarked },
  { id: 'call-monitor', label: 'Call Monitor', icon: PhoneCall },
  { id: 'settings', label: 'Settings & AI', icon: Settings },
  { id: 'roles', label: 'Roles & Access', icon: Lock },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
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

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#1a1a1a] text-green-400 rounded-xl p-4 text-xs font-mono overflow-x-auto my-4 leading-relaxed">
      {children}
    </pre>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4 p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
      <div className="w-9 h-9 rounded-xl bg-[#F27D26]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#F27D26]" />
      </div>
      <div>
        <h4 className="font-bold text-sm mb-1">{title}</h4>
        <p className="text-xs text-[#8E9299] leading-relaxed">{desc}</p>
      </div>
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
      { rootMargin: '-20% 0px -70% 0px' }
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
        <div className="fixed inset-0 z-40 pt-16 bg-white md:hidden overflow-y-auto">
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
            <p className="text-[11px] text-[#8E9299] mb-3">Claim your early access and be live in under 5 minutes.</p>
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
              VocalBridge is a cloud-based AI sales platform. You don't need to install anything — just log in and you're ready to run your first AI-powered sales campaign in minutes.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <FeatureCard icon={PhoneCall} title="AI-Powered Outbound Calls" desc="Your agent places calls, handles objections, and books meetings — 24/7." />
              <FeatureCard icon={Brain} title="Knowledge Base Training" desc="Upload docs and URLs. The AI learns your product inside out." />
              <FeatureCard icon={Sparkles} title="Real-Time AI Analysis" desc="Every call generates sentiment scores, ROI projections, and next steps." />
              <FeatureCard icon={Users} title="Lead Management" desc="Import thousands of leads via CSV. Search, tag, and filter instantly." />
            </div>

            <h3 className="text-lg font-bold mb-4">Setup in 4 Steps</h3>
            <div className="space-y-4 mb-8">
              <StepCard num="1" title="Create Your Account"
                desc="Click 'Sign in with Google'. Your account is created automatically — no forms to fill out. You'll land directly in the dashboard." />
              <StepCard num="2" title="Import Your Leads"
                desc="Go to the Clients tab. Click 'New Lead' for a single entry, or 'Import CSV' to bulk-upload. The CSV format is: name, phone, email, info, tags." />
              <StepCard num="3" title="Train Your AI Agent"
                desc="Open the Knowledge Base. Upload your product brochure, pricing sheet, or FAQ document. Gemini AI will read and structure it into a knowledge article instantly." />
              <StepCard num="4" title="Launch and Monitor"
                desc="Go to Call Monitor and click 'Initiate Secure Audio Stream' to run a demo call. The AI handles the conversation and generates a full analysis when the call ends." />
            </div>

            <Callout type="tip">
              <strong>Pro Tip:</strong> Add your top 3 objection-handling documents to the Knowledge Base before your first call. The more context the AI has, the more convincingly it addresses client concerns.
            </Callout>

            <h3 className="text-lg font-bold mb-4 mt-8">System Requirements</h3>
            <p className="text-sm text-[#8E9299] mb-3">VocalBridge runs entirely in your browser. All you need is:</p>
            <ul className="space-y-2 text-sm text-[#8E9299]">
              {[
                'A modern browser (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+)',
                'A Google account for sign-in',
                'Stable internet connection (calls stream in real-time)',
              ].map(item => (
                <li key={item} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-[#F27D26] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* ── Dashboard ── */}
          <Section id="dashboard" title="Dashboard">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              Your command center. The Dashboard loads live data from your database the moment you navigate to it, giving you an always-current view of your sales performance.
            </p>

            <h3 className="text-lg font-bold mb-4">Metrics Overview</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { title: 'Total Calls', desc: 'All completed calls logged through the Call Monitor.' },
                { title: 'Converted', desc: 'Leads whose status has been set to "Interested" — representing genuine buying intent.' },
                { title: 'Total Leads', desc: 'The total number of clients/prospects in your Clients database.' },
                { title: 'Avg Call Time', desc: 'Average duration of completed AI-handled calls.' },
              ].map(c => (
                <div key={c.title} className="p-4 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                  <h4 className="font-bold text-sm mb-1">{c.title}</h4>
                  <p className="text-xs text-[#8E9299]">{c.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold mb-4">Charts</h3>
            <div className="space-y-4 mb-8">
              <div className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                <h4 className="font-bold text-sm mb-1">Call Performance (Bar Chart)</h4>
                <p className="text-sm text-[#8E9299]">Compares calls made versus your target. The orange bar represents converted leads (sales). Use this to track whether your conversion rate is improving over time.</p>
              </div>
              <div className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                <h4 className="font-bold text-sm mb-1">Lead Conversion (Pie Chart)</h4>
                <p className="text-sm text-[#8E9299]">Visual breakdown of your lead pipeline by status: Interested, Pending, Follow-up, and Not Interested. The goal is to see the orange (Interested) slice grow over time.</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
            <p className="text-sm text-[#8E9299] mb-4">The activity feed shows your most recently added clients and their current status. Converted leads show a green checkmark; new leads show an orange clock icon.</p>

            <Callout type="note">
              Dashboard stats refresh each time you navigate to the page. They always reflect the current live state of your data — no manual refresh needed.
            </Callout>
          </Section>

          {/* ── Clients ── */}
          <Section id="clients" title="Managing Leads">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              The Clients page is your lead management hub. Every prospect your AI agent will contact lives here. You can import thousands of leads at once or add them individually.
            </p>

            <h3 className="text-lg font-bold mb-4">Adding a Single Lead</h3>
            <p className="text-sm text-[#8E9299] mb-4">Click the orange <strong className="text-[#1a1a1a]">"New Lead"</strong> button. A modal will open with these fields:</p>
            <div className="space-y-2 mb-8">
              {[
                ['Full Name', 'Required. Client\'s display name — used in call greetings and records.'],
                ['Phone Number', 'Required. Include country code (e.g. +15551234567). This is the number the AI will call.'],
                ['Email Address', 'Optional. Used for email follow-ups after the call.'],
                ['Company / Info', 'Optional. Any notes about the client or company — the AI can reference this during the call.'],
                ['Tags', 'Optional. Comma-separated labels (e.g. "hot-lead, enterprise, q2-campaign") for filtering.'],
              ].map(([field, note]) => (
                <div key={field} className="flex gap-3 items-start p-3 bg-white border border-[#1a1a1a]/5 rounded-xl">
                  <ChevronRight className="w-4 h-4 text-[#F27D26] flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong className="text-[#1a1a1a]">{field}</strong> — <span className="text-[#8E9299]">{note}</span></span>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold mb-4">Bulk Import via CSV</h3>
            <p className="text-sm text-[#8E9299] mb-3">Click <strong className="text-[#1a1a1a]">"Import CSV"</strong> and drop your file (or click to browse). The CSV must have these exact column headers in the first row:</p>
            <CodeBlock>name, phone, email, info, tags</CodeBlock>
            <p className="text-sm text-[#8E9299] mb-4">Example CSV content:</p>
            <CodeBlock>{`name, phone, email, info, tags
John Doe, +15551234567, john@example.com, "CEO at TechCorp", "enterprise, q2"
Jane Smith, +15559876543, jane@startup.io, "Early stage startup", "smb, hot-lead"
Bob Johnson, +12125550100, bob@agency.com, "Digital agency owner", "agency"`}</CodeBlock>

            <Callout type="warning">
              <strong>Important:</strong> Phone numbers must include the country code (e.g., +1 for US, +44 for UK). Numbers without a country code may fail during AI calls. Always use the international E.164 format.
            </Callout>

            <h3 className="text-lg font-bold mb-4 mt-8">Searching and Filtering</h3>
            <p className="text-sm text-[#8E9299] mb-4">Use the search bar to find leads by name or phone number. Use the tag pills above the search bar to filter by a specific tag — click <strong className="text-[#1a1a1a]">All Leads</strong> to reset the filter.</p>

            <h3 className="text-lg font-bold mb-4 mt-8">Lead Statuses Explained</h3>
            <div className="space-y-2 mb-4">
              {[
                ['pending', 'bg-yellow-100 text-yellow-700', 'Default status. Lead has not been contacted yet.'],
                ['dialing', 'bg-orange-100 text-orange-700', 'AI is currently attempting to connect to this lead.'],
                ['called', 'bg-gray-100 text-gray-700', 'Call was made. Outcome is logged in Call Monitor.'],
                ['no_answer', 'bg-gray-100 text-gray-500', 'No one answered. Lead will be rescheduled automatically.'],
                ['interested', 'bg-green-100 text-green-700', 'Lead expressed interest — this counts as a conversion in your dashboard.'],
                ['not_interested', 'bg-red-100 text-red-700', 'Lead declined. Will not be called again automatically.'],
                ['follow_up', 'bg-blue-100 text-blue-700', 'Lead requested a callback. A follow-up should be scheduled.'],
              ].map(([status, style, desc]) => (
                <div key={status} className="flex items-center gap-4 p-3 bg-white border border-[#1a1a1a]/5 rounded-xl">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${style}`}>{(status as string).replace(/_/g, ' ')}</span>
                  <p className="text-sm text-[#8E9299]">{desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold mb-4 mt-8">Deleting a Lead</h3>
            <p className="text-sm text-[#8E9299]">Click the trash icon in the Action column of any lead row. A confirmation dialog will appear before the deletion is made permanent. Deleted leads are permanently removed — this cannot be undone.</p>
          </Section>

          {/* ── Knowledge Base ── */}
          <Section id="knowledge-base" title="Knowledge Base">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              The Knowledge Base is what makes your AI agent intelligent. Without it, your agent only has basic conversational ability. With it, it becomes a domain expert that can answer technical questions, quote pricing, and handle objections with specifics.
            </p>

            <h3 className="text-lg font-bold mb-4">How It Works</h3>
            <p className="text-sm text-[#8E9299] mb-6">
              When you upload a document or URL, Gemini AI reads the content and creates a structured knowledge article — extracting key product information, pricing, FAQs, and technical specs. This article is stored in your database and referenced by the AI agent during calls when relevant questions arise.
            </p>

            <h3 className="text-lg font-bold mb-4">Uploading a PDF or Text File</h3>
            <div className="space-y-4 mb-8">
              <StepCard num="1" title="Open Knowledge Base" desc="Click 'Knowledge Base' in the left sidebar. Admin role required." />
              <StepCard num="2" title="Drop Your File" desc="Drag and drop a PDF or .txt file into the upload zone (top of the left sidebar panel), or click the zone to browse. Supported formats: PDF, TXT." />
              <StepCard num="3" title="Gemini Processes It" desc="Gemini AI reads your document and structures it into a clean knowledge article. This takes 5–20 seconds depending on document length." />
              <StepCard num="4" title="Review, Categorize, and Save" desc="The processed content appears in the editor. Review it, update the title, select a category, and click Save. The article is now part of your AI's knowledge." />
            </div>

            <Callout type="tip">
              <strong>Best documents to upload first:</strong> (1) Product one-pager with benefits, (2) Pricing sheet, (3) Top 5 customer FAQs, (4) Case studies / ROI examples, (5) Competitor comparison sheet. These 5 documents cover 90% of client questions during a typical sales call.
            </Callout>

            <h3 className="text-lg font-bold mb-4 mt-8">Adding a Web URL</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              Paste any URL into the URL field (below the upload zone) and press Enter. The AI will extract and structure the content. Useful for:
            </p>
            <ul className="space-y-2 text-sm text-[#8E9299] mb-6">
              {[
                'Your product pricing page',
                'Feature comparison pages',
                'Case study or testimonial pages',
                'Your "About" page (for company background)',
                'Competitor websites (to prepare counter-arguments)',
              ].map(item => (
                <li key={item} className="flex gap-3 items-start">
                  <LinkIcon className="w-4 h-4 text-[#F27D26] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-bold mb-4">Organizing with Categories</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              Click the tag icon (top of left sidebar) to open the category manager. Create categories like "Pricing", "Technical Specs", "Case Studies", "Objection Handling" to keep your knowledge library organized. Each document can belong to one category.
            </p>

            <h3 className="text-lg font-bold mb-4 mt-4">Editing Knowledge Articles</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              Select any article from the left sidebar to view it. Click <strong className="text-[#1a1a1a]">"Edit Article"</strong> to open the editor. You can refine the AI-generated content, correct facts, or add details Gemini might have missed. Click <strong className="text-[#1a1a1a]">Save</strong> when done.
            </p>

            <Callout type="note">
              URL scraping processes the URL's text content as provided. For best results with dynamic websites, paste the page's text content directly into a new manual article instead.
            </Callout>
          </Section>

          {/* ── Call Monitor ── */}
          <Section id="call-monitor" title="Call Monitor">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              The Call Monitor is your real-time control room. Every call your AI agent makes is tracked here with a full transcript, AI-generated summary, and actionable insights.
            </p>

            <h3 className="text-lg font-bold mb-4">Running a Demo Call</h3>
            <div className="space-y-4 mb-8">
              <StepCard num="1" title="Open Call Monitor" desc="Click 'Call Monitor' in the sidebar. You'll see the Active Call Terminal — a dark panel showing the current call status." />
              <StepCard num="2" title="Initiate a Call" desc="Click 'Initiate Secure Audio Stream'. The system will simulate dialing for ~1.5 seconds, then the call begins." />
              <StepCard num="3" title="Watch the Transcript" desc="The live transcription panel below shows each line of dialogue as it appears — agent messages on the left, customer on the right." />
              <StepCard num="4" title="End the Call" desc="Click the red phone button to end the call. Gemini immediately analyzes the transcript and generates a full summary." />
              <StepCard num="5" title="Review AI Insights" desc="The summary shows sentiment, outcome, ROI projection, and upsell opportunities. You can override the outcome classification if needed." />
            </div>

            <h3 className="text-lg font-bold mb-4">What the AI Analyzes</h3>
            <div className="space-y-3 mb-8">
              {[
                { icon: Sparkles, title: 'Sentiment', desc: 'Classified as Positive, Neutral, or Negative based on the customer\'s tone and language throughout the call.' },
                { icon: CheckCircle2, title: 'Outcome', desc: 'One of four outcomes: Sale Made, Follow-up Scheduled, Not Interested, or No Answer. You can override this manually if needed.' },
                { icon: BarChart2, title: 'ROI Projection', desc: 'Gemini estimates potential revenue or cost savings based on the conversation context and your product\'s value proposition.' },
                { icon: Tag, title: 'Upsell Opportunities', desc: 'Adjacent products or services the client mentioned interest in or that relate to their stated problem.' },
                { icon: FileText, title: 'Key Points', desc: 'Top 3–5 discussion points from the call — what was covered, what resonated, and what needs follow-up.' },
                { icon: AlertCircle, title: 'Objections Raised', desc: 'Specific concerns the customer expressed — pricing, timing, competitors, technical requirements — for your review.' },
              ].map(c => (
                <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
              ))}
            </div>

            <h3 className="text-lg font-bold mb-4">Live Suggestions Panel</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              During an active call, the right-side panel shows real-time knowledge suggestions. When the AI detects a keyword (like "pricing" or "competitor"), it surfaces the relevant knowledge article for the agent to reference. This keeps the conversation grounded in accurate product information.
            </p>

            <Callout type="tip">
              After a call, use the outcome override buttons (Sale Made, Follow-up Scheduled, etc.) to manually correct the AI classification if needed. These corrections improve your dashboard accuracy.
            </Callout>
          </Section>

          {/* ── Settings ── */}
          <Section id="settings" title="Settings & AI Configuration">
            <p className="text-[#8E9299] leading-relaxed mb-6">Configure your AI agent's personality, voice, and behavior. All settings are saved to your account and persist across sessions. Only Admin users can access Settings.</p>

            <h3 className="text-lg font-bold mb-4">AI Persona Tab</h3>
            <div className="space-y-4 mb-8">
              <div className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                <h4 className="font-bold mb-2">Agent Name</h4>
                <p className="text-sm text-[#8E9299]">The name your AI introduces itself as during calls. Example: "Alex from TechCloud Solutions". Keep it professional and memorable.</p>
              </div>
              <div className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                <h4 className="font-bold mb-2">Conversation Tone</h4>
                <p className="text-sm text-[#8E9299]">Describes how the agent speaks. Examples: "Professional, direct, confident" / "Warm, empathetic, consultative" / "Energetic, concise, results-focused". Use 3–5 descriptors.</p>
              </div>
              <div className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                <h4 className="font-bold mb-2">Speech Patterns</h4>
                <p className="text-sm text-[#8E9299]">Guides how the agent handles natural conversation dynamics. Example: "Pause 1–2 seconds after questions. Use occasional natural fillers like 'absolutely' and 'that makes sense'. If interrupted, acknowledge and let them finish."</p>
              </div>
              <div className="p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                <h4 className="font-bold mb-2">System Instructions</h4>
                <p className="text-sm text-[#8E9299]">The raw prompt sent to Gemini before every call. This is advanced configuration — it defines the agent's core identity, goals, and hard constraints. The default is optimized for sales. Only modify this if you have a specific use case or industry requirement.</p>
                <Callout type="warning">
                  Do not remove the instruction "NEVER mention you are an AI" from System Instructions — this is required for natural conversation flow and compliance with the platform's terms.
                </Callout>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">Voice Selection</h3>
            <p className="text-sm text-[#8E9299] mb-4">Choose from 8 Gemini TTS prebuilt voices. Each has a distinct character:</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-6">
              {[
                ['Kore', 'US English', 'Neutral & Balanced — best all-rounder'],
                ['Puck', 'US English', 'Youthful & Direct — tech/startup feel'],
                ['Charon', 'US English', 'Deep & Authoritative — enterprise sales'],
                ['Zephyr', 'UK English', 'Bright & Empathetic — consultative roles'],
                ['Aoede', 'Australian', 'Warm & Friendly — approachable'],
                ['Eos', 'UK English', 'Calm & Professional — financial/legal'],
                ['Helius', 'US English', 'Energetic & Fast — high-volume calling'],
                ['Nyx', 'US English', 'Whispery & Soft — premium/luxury brand'],
              ].map(([name, accent, desc]) => (
                <div key={name} className="p-3 bg-white border border-[#1a1a1a]/5 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{name}</span>
                    <span className="text-[10px] text-[#8E9299] font-mono">{accent}</span>
                  </div>
                  <p className="text-[11px] text-[#8E9299]">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#8E9299] mb-4">Click <strong className="text-[#1a1a1a]">Preview Voice</strong> to hear the selected voice before saving. Use this to test how your agent sounds before launching a campaign.</p>

            <h3 className="text-lg font-bold mb-4">Voice Dynamics</h3>
            <div className="space-y-3 mb-6">
              {[
                ['Speech Speed', '0.5 (slow) → 2.0 (fast). Default: 1.0. For cold outreach, 0.9–1.0 feels natural. For technical demos, 0.8 gives listeners time to process.'],
                ['Vocal Pitch', '0.5 (lower) → 1.5 (higher). Default: 1.0. Slight adjustments (±0.1) make a big difference.'],
                ['Emotional Inflection', '0 (flat/monotone) → 1.0 (highly expressive). Default: 0.7. Higher inflection sounds more engaging but less formal.'],
              ].map(([label, desc]) => (
                <div key={label} className="p-4 bg-white border border-[#1a1a1a]/5 rounded-2xl">
                  <h4 className="font-bold text-sm mb-1">{label}</h4>
                  <p className="text-xs text-[#8E9299]">{desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold mb-4">AI Voice Cloning</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              Upload a high-quality audio sample of a real human voice to create a custom neural voice profile. The AI will attempt to replicate the voice's characteristics for all future calls.
            </p>
            <div className="p-4 bg-[#F27D26]/5 border border-[#F27D26]/10 rounded-2xl mb-4 space-y-2">
              <p className="text-sm font-bold text-[#1a1a1a]">Audio Sample Requirements</p>
              <ul className="space-y-1 text-sm text-[#8E9299]">
                <li>• Format: MP3, WAV, M4A, or OGG</li>
                <li>• Length: 30 seconds minimum, 1–2 minutes ideal</li>
                <li>• Quality: 44.1kHz or 48kHz recommended, mono or stereo</li>
                <li>• Environment: Clean recording — no background music, echo, or noise</li>
                <li>• Content: Natural speech, not reading — tell a story or explain something</li>
              </ul>
            </div>

            <h3 className="text-lg font-bold mb-4 mt-8">Knowledge Focus Areas</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              In the Knowledge Focus tab, add the specific topics your AI should prioritize during calls. Examples: "Product ROI", "Enterprise Security Compliance", "Integration with Salesforce", "30-day free trial". The AI will naturally steer conversations toward these focus areas.
            </p>

            <Callout type="tip">
              <strong>Save Settings before leaving the page.</strong> Changes are not auto-saved. Click "Save Changes" in the top-right to persist your configuration to the database.
            </Callout>
          </Section>

          {/* ── Roles ── */}
          <Section id="roles" title="Roles & Access Control">
            <p className="text-[#8E9299] leading-relaxed mb-6">
              VocalBridge supports two user roles: Admin and Agent. Role assignment controls which parts of the application each user can access.
            </p>

            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1a1a1a] text-white">
                    <th className="text-left px-4 py-3 rounded-tl-xl text-xs font-bold uppercase tracking-wider">Feature</th>
                    <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider">Admin</th>
                    <th className="text-center px-4 py-3 rounded-tr-xl text-xs font-bold uppercase tracking-wider">Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]/5">
                  {[
                    ['Dashboard', true, true],
                    ['Clients — View & Search', true, true],
                    ['Clients — Add / Import', true, true],
                    ['Clients — Delete', true, false],
                    ['Call Monitor', true, true],
                    ['Knowledge Base', true, false],
                    ['Settings / AI Config', true, false],
                    ['Role Switching (Demo)', true, true],
                  ].map(([feature, admin, agent]) => (
                    <tr key={feature as string} className="bg-white hover:bg-[#FDFCFB]">
                      <td className="px-4 py-3 font-medium text-[#1a1a1a]">{feature}</td>
                      <td className="px-4 py-3 text-center">{admin ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                      <td className="px-4 py-3 text-center">{agent ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold mb-4">Switching Personas (Demo)</h3>
            <p className="text-sm text-[#8E9299] mb-4">
              The <strong className="text-[#1a1a1a]">Switch Persona</strong> buttons in the bottom of the left sidebar let you toggle between Admin and Agent views. This is a demo feature to explore what each role sees. In a production multi-user setup, roles would be assigned server-side and could not be self-modified.
            </p>

            <Callout type="note">
              When an Agent role tries to access Knowledge Base or Settings URLs directly, they are automatically redirected to the Dashboard. This is enforced at the routing level.
            </Callout>
          </Section>

          {/* ── Troubleshooting ── */}
          <Section id="troubleshooting" title="Troubleshooting">
            <p className="text-[#8E9299] leading-relaxed mb-6">Common issues and how to resolve them.</p>

            <div className="space-y-4">
              {[
                {
                  problem: 'Login page shows a Google sign-in error',
                  cause: 'Firebase Auth may not have your domain whitelisted, or the Google OAuth app may not be configured for the current environment.',
                  fix: 'Try the test mode: open your browser console and run localStorage.setItem("vocalbridge_test_mode", "true"), then refresh the page. This bypasses Firebase Auth entirely for local testing.'
                },
                {
                  problem: 'Dashboard shows 0 for all metrics after adding leads',
                  cause: 'Firestore security rules may be blocking reads, or the Firestore project ID in your environment variables is incorrect.',
                  fix: 'Check your browser console for Firestore permission errors. Verify VITE_FIREBASE_PROJECT_ID in your .env file matches your Firebase project. Ensure Firestore rules allow authenticated reads.'
                },
                {
                  problem: 'CSV import completes but no leads appear',
                  cause: 'Your CSV may not have the correct column header names, or the phone column is empty/missing.',
                  fix: 'Ensure the first row contains exactly: name, phone, email, info, tags. The "phone" column is required — rows without it are skipped. Check that values aren\'t empty in the name/phone columns.'
                },
                {
                  problem: 'AI Summary generation fails after ending a call',
                  cause: 'The GEMINI_API_KEY environment variable is missing, incorrect, or the Gemini API quota has been exceeded.',
                  fix: 'Check that GEMINI_API_KEY is set in your .env file. Verify the key is active at aistudio.google.com. Check your Google AI Studio quota dashboard for rate limit errors.'
                },
                {
                  problem: 'Voice preview button does nothing or plays silence',
                  cause: 'The Gemini TTS API requires a valid API key and may have browser autoplay restrictions.',
                  fix: 'Ensure your GEMINI_API_KEY is configured. Check browser console for errors. Some browsers block audio autoplay until a user gesture — try clicking Preview Voice again after interacting with the page.'
                },
                {
                  problem: 'Knowledge Base document shows wrong "Last Updated" date',
                  cause: 'Timestamps written by Firestore serverTimestamp() are Firestore Timestamp objects, not JavaScript Date strings.',
                  fix: 'This is handled automatically by the formatDate() utility. If you see unexpected date output, check that the lastUpdated field is being saved with serverTimestamp() and read using formatDate().'
                },
                {
                  problem: 'Phone numbers display as raw digits instead of formatted',
                  cause: 'The formatPhoneNumber() utility expects E.164 format (international) or a plain 10-digit US number.',
                  fix: 'Ensure phone numbers in your CSV or manual entries follow the format +15551234567 (with country code). Numbers in other formats will be displayed as-is without formatting.'
                },
              ].map((item, i) => (
                <details key={i} className="group p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl cursor-pointer">
                  <summary className="font-bold text-sm list-none flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      {item.problem}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#8E9299] group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="mt-4 space-y-2 pl-6">
                    <p className="text-xs text-[#8E9299]"><strong className="text-[#1a1a1a]">Why it happens:</strong> {item.cause}</p>
                    <p className="text-xs text-[#8E9299]"><strong className="text-[#1a1a1a]">Fix:</strong> {item.fix}</p>
                  </div>
                </details>
              ))}
            </div>
          </Section>

          {/* ── FAQ ── */}
          <Section id="faq" title="FAQ">
            <div className="space-y-4">
              {[
                {
                  q: 'Is the AI agent voice detectable as a robot?',
                  a: 'No. VocalBridge uses Google\'s Gemini TTS which produces natural, human-sounding speech with prosodic variation, natural pauses, and tonal expression. Your agent is configured to introduce itself by name (e.g., "Hi, this is Alex from TechCloud") and never reveals it\'s AI unless directly asked.'
                },
                {
                  q: 'What happens when a lead asks to speak to a human?',
                  a: 'The agent will politely acknowledge the request and offer to schedule a callback with a team member. The call will be logged with a "Follow-up Scheduled" outcome in the Call Monitor. Your human team can then follow up using the contact details on the Clients page.'
                },
                {
                  q: 'How many calls can my agent make simultaneously?',
                  a: 'The Starter plan supports sequential calls (one at a time). The Growth plan unlocks up to 5 concurrent calls. Enterprise plans support unlimited concurrency with custom rate limits. You can see your plan details in the Settings page once billing is configured.'
                },
                {
                  q: 'Is my data secure?',
                  a: 'Yes. All data is stored in Google Firebase with role-based Firestore security rules. Your Gemini API key is stored as a server-side environment variable and never exposed to the browser. Phone numbers and email addresses are only readable by authenticated users.'
                },
                {
                  q: 'Can I use VocalBridge for inbound calls too?',
                  a: 'Currently VocalBridge is optimized for outbound campaigns. Inbound call routing (via Twilio webhook integration) is on the roadmap for the next major release.'
                },
                {
                  q: 'What languages does the AI support?',
                  a: 'Gemini supports over 40 languages. However, the default system instructions and voice configurations are English-optimized. For non-English campaigns, update the System Instructions in Settings to specify the target language, and select a voice that matches the accent.'
                },
                {
                  q: 'Can I run campaigns on a schedule?',
                  a: 'Scheduled campaigns (e.g., "call all pending leads on Monday at 9am") are on the roadmap. Currently, campaigns are triggered manually from the Call Monitor page.'
                },
                {
                  q: 'How does the AI use the Knowledge Base during a call?',
                  a: 'The AI is given the contents of your Knowledge Base as context before each call begins. When a customer asks a question that relates to a knowledge article, the AI retrieves the relevant section and incorporates it into its response naturally. The Live Suggestions panel in the Call Monitor shows when a knowledge trigger is detected.'
                },
                {
                  q: 'Can I export my call data?',
                  a: 'CSV export for call logs and client data is on the roadmap. Currently, all data is accessible via the Dashboard and Clients table. For bulk exports, your Firestore data can be exported directly from the Firebase console.'
                },
                {
                  q: 'Can I cancel my early access plan?',
                  a: 'Yes, anytime. There are no lock-in contracts. If you cancel, your account and all data remain accessible until the end of your billing period, after which the account transitions to a free tier with limited functionality.'
                },
              ].map((item, i) => (
                <details key={i} className="group p-5 bg-white border border-[#1a1a1a]/5 rounded-2xl cursor-pointer">
                  <summary className="font-bold text-sm list-none flex items-center justify-between">
                    {item.q}
                    <ChevronRight className="w-4 h-4 text-[#8E9299] group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <p className="mt-4 text-sm text-[#8E9299] leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </Section>

          {/* Bottom CTA */}
          <div className="mt-10 p-8 bg-[#1a1a1a] rounded-3xl text-center">
            <h3 className="text-2xl font-black text-white mb-3">Ready to Automate Your Sales?</h3>
            <p className="text-gray-400 text-sm mb-6">Join the teams already using VocalBridge to run smarter outbound campaigns with AI.</p>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#F27D26] text-[#1a1a1a] rounded-xl font-bold hover:opacity-90 transition-all">
              Claim Early Access <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
