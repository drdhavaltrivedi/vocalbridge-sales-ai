import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  PhoneCall, Brain, BookOpen, Users, BarChart2, Zap,
  CheckCircle2, ArrowRight, Menu, X, Star, Sparkles,
  ChevronRight, Shield, Clock, TrendingUp
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/docs' },
];

const FEATURES = [
  { icon: PhoneCall, title: 'AI Voice Calls', desc: 'Automated outbound calls that sound human. Your agent handles objections, answers questions, and books appointments 24/7.' },
  { icon: Brain, title: 'Gemini Powered', desc: "Backed by Google's most capable AI. Your agent learns from your knowledge base and gets smarter with every interaction." },
  { icon: BookOpen, title: 'Smart Knowledge Base', desc: 'Upload PDFs, pricing sheets, or URLs. Your agent uses them to answer client questions with perfect accuracy.' },
  { icon: Users, title: 'Lead Management', desc: 'Import CSV lists, add leads manually, tag and filter your pipeline. Everything your team needs in one place.' },
  { icon: BarChart2, title: 'Live Analytics', desc: 'Track calls, conversions, sentiment, and ROI in real-time. Know exactly what is and is not working.' },
  { icon: Zap, title: 'Zero Training Needed', desc: 'Your team is ready in minutes, not months. No scripts to write, no sales training required. Just launch.' },
];

const STEPS = [
  { num: '01', title: 'Import Your Leads', desc: 'Upload a CSV or add leads manually. Tag them by segment, priority, or campaign.' },
  { num: '02', title: 'Train Your AI Agent', desc: 'Drop in your product docs, pricing sheets, and FAQs. Your agent learns everything instantly.' },
  { num: '03', title: 'Watch It Sell', desc: 'Your AI agent calls leads, handles objections, and books meetings — while your team focuses on closing.' },
];

const TESTIMONIALS = [
  { name: 'Rohan Mehta', role: 'VP Sales, TechNova', quote: "We went from 40 calls a day to 400 — without hiring anyone. VocalBridge paid for itself in week one.", rating: 5 },
  { name: 'Sarah K.', role: 'Founder, GrowthLoop', quote: "The knowledge base feature is a game changer. Our AI handles complex technical questions better than some of our reps.", rating: 5 },
  { name: 'James Okafor', role: 'Head of BDR, Scalify', quote: "Early access was a no-brainer. The ROI dashboard alone showed we were leaving money on the table every day.", rating: 5 },
];

const PLANS = [
  {
    name: 'Starter',
    price: '$20',
    period: '/month',
    tagline: 'Perfect for solo founders & small teams',
    highlight: false,
    badge: null,
    features: [
      '100 AI Calls / month',
      'Up to 500 leads',
      '1 AI Agent',
      'Basic analytics dashboard',
      'Knowledge base (5 docs)',
      'Email support',
    ],
    cta: 'Claim Early Access',
  },
  {
    name: 'Growth',
    price: '$100',
    period: '/month',
    tagline: 'Built for scaling sales teams',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '1,000 AI Calls / month',
      'Unlimited leads',
      '3 AI Agents',
      'Full analytics + ROI projections',
      'Knowledge base (unlimited)',
      'Priority support',
      'CSV bulk import',
      'Custom agent persona',
    ],
    cta: 'Claim Early Access',
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    tagline: 'For high-volume revenue teams',
    highlight: false,
    badge: 'Best Value',
    features: [
      'Unlimited AI Calls',
      'Unlimited leads & agents',
      'Dedicated AI agent training',
      'White-label dashboard',
      'API access',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
  },
];

const STATS = [
  { value: '3x', label: 'Avg. Sales Growth' },
  { value: '24/7', label: 'AI Always Active' },
  { value: '< 2min', label: 'Setup Time' },
  { value: '500+', label: 'Teams Onboarded' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-[#FDFCFB] text-[#1a1a1a] font-sans overflow-x-hidden">
      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#1a1a1a]/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="VocalBridge" className="w-8 h-8 object-contain rounded-lg" />
            <span className="font-bold text-lg tracking-tight">VocalBridge AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              l.href.startsWith('/') 
                ? <Link key={l.label} to={l.href} className="text-sm font-medium text-[#8E9299] hover:text-[#1a1a1a] transition-colors">{l.label}</Link>
                : <a key={l.label} href={l.href} className="text-sm font-medium text-[#8E9299] hover:text-[#1a1a1a] transition-colors">{l.label}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[#8E9299] hover:text-[#1a1a1a] transition-colors">Sign In</Link>
            <a href="#pricing" className="px-5 py-2 bg-[#F27D26] text-[#1a1a1a] rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-[#F27D26]/20">
              Claim Early Access →
            </a>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-[#1a1a1a]/5 px-6 py-4 space-y-4">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-[#8E9299]">{l.label}</a>
            ))}
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block px-5 py-2.5 bg-[#F27D26] text-[#1a1a1a] rounded-xl text-sm font-bold text-center">Claim Early Access →</a>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F27D26]/10 text-[#F27D26] rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Early Access Now Open
            </div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-6">
              Close More Deals.<br />
              <span className="text-[#F27D26]">Automatically.</span>
            </h1>
            <p className="text-lg text-[#8E9299] leading-relaxed max-w-lg mb-10">
              VocalBridge is an AI-powered sales agent that calls your leads, handles objections, answers questions, and books meetings — 24 hours a day, 7 days a week. No extra headcount required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#pricing" className="flex items-center justify-center gap-2 px-8 py-4 bg-[#1a1a1a] text-white rounded-2xl font-bold hover:bg-[#1a1a1a]/80 transition-all shadow-xl text-base">
                Claim Early Access <ArrowRight className="w-4 h-4" />
              </a>
              <Link to="/docs" className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-[#1a1a1a]/10 text-[#1a1a1a] rounded-2xl font-bold hover:bg-gray-50 transition-all text-base">
                See How It Works
              </Link>
            </div>
            <p className="mt-5 text-xs text-[#8E9299]">✓ No credit card required &nbsp;·&nbsp; ✓ Setup in under 2 minutes &nbsp;·&nbsp; ✓ Cancel anytime</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl hidden lg:block">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-gray-500 font-mono">vocalbridge.ai — dashboard</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: 'Calls Today', value: '84', trend: '+12%', color: 'text-green-400' },
                { label: 'Converted', value: '19', trend: '+31%', color: 'text-[#F27D26]' },
                { label: 'Active Leads', value: '312', trend: '+8%', color: 'text-blue-400' },
                { label: 'Avg Sentiment', value: 'Positive', trend: '↑', color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-xl font-bold text-white`}>{s.value}</p>
                  <p className={`text-xs font-medium mt-1 ${s.color}`}>{s.trend}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">Agent Active — Call in Progress</span>
              </div>
              <div className="space-y-2">
                <div className="bg-[#F27D26]/20 text-[#F27D26] text-xs px-3 py-2 rounded-lg w-3/4">Agent: Hi Sarah, I'm calling about our AI sales platform...</div>
                <div className="bg-white/10 text-white text-xs px-3 py-2 rounded-lg w-2/3 ml-auto">Client: Oh yes, I was actually curious about pricing...</div>
                <div className="bg-[#F27D26]/20 text-[#F27D26] text-xs px-3 py-2 rounded-lg w-4/5">Agent: Great question! Our Growth plan starts at just $100/month and typically pays back within the first week...</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-[#1a1a1a] py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
              <p className="text-3xl font-black text-[#F27D26]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#F27D26] font-bold text-xs uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-black tracking-tight">Everything Your Sales Team Needs</h2>
            <p className="text-[#8E9299] mt-4 max-w-xl mx-auto">From first dial to signed contract — VocalBridge handles the heavy lifting so your team can focus on what matters.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="p-8 bg-white border border-[#1a1a1a]/5 rounded-3xl hover:shadow-lg transition-shadow group">
                <div className="w-12 h-12 bg-[#F27D26]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#F27D26]/20 transition-colors">
                  <f.icon className="w-6 h-6 text-[#F27D26]" />
                </div>
                <h3 className="text-lg font-bold mb-3">{f.title}</h3>
                <p className="text-[#8E9299] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#F27D26] font-bold text-xs uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-4xl font-black tracking-tight text-white">Up and Running in 3 Steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} viewport={{ once: true }}
                className="text-center">
                <div className="text-6xl font-black text-[#F27D26]/20 mb-4">{s.num}</div>
                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/docs" className="inline-flex items-center gap-2 text-[#F27D26] font-bold text-sm hover:gap-3 transition-all">
              Read the full documentation <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#F27D26] font-bold text-xs uppercase tracking-widest mb-3">Social Proof</p>
            <h2 className="text-4xl font-black tracking-tight">Teams That Switched Never Looked Back</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="p-8 bg-white border border-[#1a1a1a]/5 rounded-3xl shadow-sm">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-4 h-4 fill-[#F27D26] text-[#F27D26]" />)}
                </div>
                <p className="text-[#1a1a1a] text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F27D26]/20 flex items-center justify-center font-bold text-[#F27D26] text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-[#8E9299]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-[#FDFCFB]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-[#F27D26] font-bold text-xs uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-black tracking-tight">Simple, Honest Pricing</h2>
            <p className="text-[#8E9299] mt-4 max-w-md mx-auto">Early access members lock in their rate forever. Prices will increase after launch.</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-[#F27D26]/10 text-[#F27D26] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mx-auto flex mb-12 w-fit">
            <Clock className="w-3.5 h-3.5" /> Limited Early Access Spots Available
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`relative rounded-3xl p-8 flex flex-col ${plan.highlight ? 'bg-[#1a1a1a] text-white shadow-2xl scale-[1.03]' : 'bg-white border border-[#1a1a1a]/5'}`}>
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${plan.highlight ? 'bg-[#F27D26] text-[#1a1a1a]' : 'bg-[#1a1a1a] text-white'}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-[#F27D26]' : 'text-[#8E9299]'}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? 'text-gray-400' : 'text-[#8E9299]'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm mt-2 ${plan.highlight ? 'text-gray-400' : 'text-[#8E9299]'}`}>{plan.tagline}</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-[#F27D26]' : 'text-green-500'}`} />
                      <span className={plan.highlight ? 'text-gray-300' : 'text-[#1a1a1a]'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/login"
                  className={`w-full py-3.5 rounded-xl font-bold text-sm text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    plan.highlight
                      ? 'bg-[#F27D26] text-[#1a1a1a] shadow-lg shadow-[#F27D26]/30'
                      : 'bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80'
                  }`}>
                  {plan.cta} →
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-[#8E9299]">
            {['No credit card to start', '14-day free trial', 'Cancel anytime', 'Lock in your rate forever'].map(t => (
              <div key={t} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6 bg-[#1a1a1a]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F27D26]/20 text-[#F27D26] rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <TrendingUp className="w-3.5 h-3.5" /> Join 500+ Sales Teams Growing With AI
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-6">
            Your Competitors Are<br />Already Using AI.
          </h2>
          <p className="text-gray-400 text-lg mb-10">Don't get left behind. Claim your early access spot and lock in founder pricing before we increase rates at launch.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#pricing" className="px-10 py-4 bg-[#F27D26] text-[#1a1a1a] rounded-2xl font-black text-base hover:opacity-90 transition-all shadow-xl shadow-[#F27D26]/20">
              Claim Early Access Now →
            </a>
            <Link to="/docs" className="px-10 py-4 bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-base hover:bg-white/20 transition-all">
              Read Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#1a1a1a] border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="VocalBridge" className="w-7 h-7 object-contain rounded-lg" />
            <span className="font-bold text-white">VocalBridge AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="text-xs text-gray-500 hover:text-white transition-colors">Documentation</Link>
            <a href="#pricing" className="text-xs text-gray-500 hover:text-white transition-colors">Pricing</a>
            <Link to="/login" className="text-xs text-gray-500 hover:text-white transition-colors">Login</Link>
            <a href="mailto:hello@vocalbridge.ai" className="text-xs text-gray-500 hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-xs text-gray-600">© 2025 VocalBridge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
