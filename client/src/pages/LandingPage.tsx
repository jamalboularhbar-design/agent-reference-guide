import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Link } from 'wouter';
import {
  BookOpen, Brain, BarChart3, Shield, Users, Zap,
  CheckCircle2, ArrowRight, Star, ChevronRight, Sparkles,
  Network, Clock, Search, FileText, Lock, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const HERO_IMG = '/manus-storage/hero-dashboard_9f31bf62.png';
const KNOWLEDGE_GRAPH_IMG = '/manus-storage/feature-knowledge-graph_ed196875.png';
const ANALYTICS_IMG = '/manus-storage/feature-analytics_315c687f.png';
const AI_ASSISTANT_IMG = '/manus-storage/feature-ai-assistant_1c6d801e.png';
const LOGO_IMG = '/manus-storage/logo-icon_7cc98e89.png';

export default function LandingPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: false });
  const submitLead = trpc.leads.submit.useMutation();

  const [form, setForm] = useState({
    fullName: '', email: '', company: '', jobTitle: '', teamSize: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      toast.error('Please fill in your name and email');
      return;
    }
    try {
      await submitLead.mutateAsync({ ...form, source: 'landing_page' });
      setSubmitted(true);
      toast.success('Thank you! We\'ll be in touch shortly.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_IMG} alt="OpsCanvas" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold tracking-tight">OpsCanvas</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/">
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                  Go to App <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <a href="#contact">
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                  Request Demo
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-medium text-teal-300">AI-Powered Operations Intelligence</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
              Your team's knowledge,<br />
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
                always within reach
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              OpsCanvas is the AI-powered operational knowledge platform that turns scattered SOPs, playbooks, and guides into a living, searchable intelligence layer your entire team can trust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-8 py-6 text-lg">
                  Request Early Access <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 px-8 py-6 text-lg">
                  See Features
                </Button>
              </a>
            </div>
          </div>
          {/* Hero Image */}
          <div className="relative mt-16 mx-auto max-w-5xl">
            <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-cyan-500/10 to-purple-500/20 rounded-2xl blur-3xl" />
            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={HERO_IMG} alt="OpsCanvas Dashboard" className="w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">See OpsCanvas in Action</h2>
          <p className="text-gray-400 mb-8">Watch a 2-minute walkthrough of the platform</p>
          <div className="relative mx-auto max-w-3xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-[#0F1A2E] flex items-center justify-center group cursor-pointer" onClick={() => toast.info('Demo video coming soon! Request a live demo instead.', { action: { label: 'Request Demo', onClick: () => { const el = document.getElementById('contact'); el?.scrollIntoView({ behavior: 'smooth' }); } } })}>
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5" />
            <img src={HERO_IMG} alt="OpsCanvas Demo" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                <svg className="w-8 h-8 text-teal-400 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <span className="text-sm text-gray-400">Click to play demo</span>
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/roi">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/5">
                Try ROI Calculator
              </Button>
            </Link>
            <a href="#contact">
              <Button className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                Request Live Demo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-widest">Trusted by operations teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-gray-500">
            {['Hospitality Groups', 'SaaS Companies', 'Consulting Firms', 'Creative Agencies', 'Franchise Networks'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-lg font-semibold opacity-40">
                <Globe className="w-5 h-5" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Your operational knowledge is <span className="text-red-400">scattered, outdated, and hard to find</span>
          </h2>
          <p className="text-lg text-gray-400 mb-12 leading-relaxed">
            SOPs live in Google Docs. Playbooks are buried in Notion. Onboarding guides are PDFs from 2022. When a new hire asks "how do we handle X?" — nobody knows where to look. OpsCanvas fixes this.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: '67%', label: 'of employees say they can\'t find the information they need to do their job', source: 'McKinsey' },
              { stat: '9.3h', label: 'per week wasted searching for information across disconnected tools', source: 'IDC Research' },
              { stat: '$47M', label: 'annual cost of poor knowledge management for a 1,000-person company', source: 'Panopto' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-3xl font-bold text-teal-400 mb-2">{item.stat}</div>
                <p className="text-sm text-gray-400 mb-2">{item.label}</p>
                <p className="text-xs text-gray-600">Source: {item.source}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-transparent via-teal-500/[0.03] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4">
              <span className="text-xs font-medium text-teal-300">PLATFORM FEATURES</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">Everything your ops team needs</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">From AI-powered search to knowledge graphs, OpsCanvas gives your team superpowers.</p>
          </div>

          {/* Feature 1: Knowledge Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-5 h-5 text-teal-400" />
                <span className="text-sm font-semibold text-teal-400 uppercase tracking-wider">Knowledge Graph</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">See how everything connects</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Visualize relationships between SOPs, playbooks, and guides. Discover gaps in your documentation. Understand which processes depend on each other before making changes.
              </p>
              <ul className="space-y-3">
                {['Interactive node-link visualization', 'Auto-detected cross-references', 'Gap analysis and coverage mapping', 'Category-based clustering'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-2xl blur-2xl" />
              <img src={KNOWLEDGE_GRAPH_IMG} alt="Knowledge Graph" className="relative rounded-xl border border-white/10 shadow-xl w-full object-contain" />
            </div>
          </div>

          {/* Feature 2: Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-2xl blur-2xl" />
              <img src={ANALYTICS_IMG} alt="Analytics Dashboard" className="relative rounded-xl border border-white/10 shadow-xl w-full object-contain" />
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Reading Analytics</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Know what your team actually reads</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Track engagement across every document. See which SOPs are being read, which are gathering dust, and where your team spends the most time. Make data-driven decisions about content investment.
              </p>
              <ul className="space-y-3">
                {['Real-time reading heatmaps', 'Stale content detection', 'Team engagement scorecards', 'Export-ready compliance reports'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3: AI Assistant */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">AI Content Assistant</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">AI that understands your operations</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Our AI doesn't just search — it understands context. It detects duplicates, suggests improvements, flags stale content, and helps your team write better documentation faster.
              </p>
              <ul className="space-y-3">
                {['Duplicate content detection', 'AI-powered writing suggestions', 'Automated broken link scanning', 'Smart document summarization'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-2xl" />
              <img src={AI_ASSISTANT_IMG} alt="AI Assistant" className="relative rounded-xl border border-white/10 shadow-xl w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">And so much more</h2>
            <p className="text-gray-400">Every feature your operations team has been asking for.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'Advanced Search', desc: 'Full-text search with filters, saved queries, and autocomplete across all documents' },
              { icon: FileText, title: 'Version Control', desc: 'Track every change with full diff history, rollback capability, and audit trails' },
              { icon: Users, title: 'Dual Persona System', desc: 'Switch between operational contexts seamlessly — one platform, multiple workflows' },
              { icon: Clock, title: 'Reading Time Estimates', desc: 'AI-calculated reading times with complexity scoring for every document' },
              { icon: Lock, title: 'Role-Based Access', desc: 'Granular permissions with admin, editor, and viewer roles plus workspace isolation' },
              { icon: Zap, title: 'Workflow Automation', desc: 'Scheduled publishing, review reminders, and automated content health checks' },
              { icon: BookOpen, title: 'Document Collections', desc: 'Curate reading paths and onboarding sequences for different team roles' },
              { icon: Shield, title: 'Compliance Reports', desc: 'Generate audit-ready reports showing document freshness, coverage, and access logs' },
              { icon: Star, title: 'Engagement Scoring', desc: 'Gamified reading streaks, leaderboards, and team engagement scorecards' },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/[0.03] border border-white/5 hover:border-teal-500/20 transition-colors group">
                <feature.icon className="w-8 h-8 text-teal-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Up and running in days, not months</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">OpsCanvas is designed for fast deployment. Import your existing docs, configure your workflows, and start seeing value immediately.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Import & Organize', desc: 'Bulk import from Google Docs, Notion, Confluence, or plain files. AI auto-categorizes and tags everything.' },
              { step: '02', title: 'Configure & Customize', desc: 'Set up personas, workflows, permissions, and branding. Make it yours in minutes, not weeks.' },
              { step: '03', title: 'Launch & Measure', desc: 'Invite your team. Track adoption with real-time analytics. AI surfaces what needs attention.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-teal-500/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-teal-500/20" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400">Start with a pilot. Scale when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: '$12',
                period: '/seat/month',
                desc: 'For small teams getting organized',
                features: ['Up to 25 users', '500 documents', 'Full-text search', 'Basic analytics', 'Email support'],
                cta: 'Start Free Trial',
                highlight: false,
              },
              {
                name: 'Professional',
                price: '$24',
                period: '/seat/month',
                desc: 'For growing operations teams',
                features: ['Up to 200 users', 'Unlimited documents', 'AI content assistant', 'Knowledge graph', 'Advanced analytics', 'Workflow automation', 'Priority support'],
                cta: 'Request Demo',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'For organizations at scale',
                features: ['Unlimited users', 'SSO / SAML', 'Custom integrations', 'Dedicated success manager', 'SLA guarantees', 'On-premise option', 'Custom training'],
                cta: 'Contact Sales',
                highlight: false,
              },
            ].map((plan, i) => (
              <div key={i} className={`p-8 rounded-2xl border ${plan.highlight ? 'bg-gradient-to-b from-teal-500/10 to-transparent border-teal-500/30 relative' : 'bg-white/[0.02] border-white/5'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-teal-500 text-black text-xs font-bold rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">{plan.desc}</p>
                <a href="#contact">
                  <Button className={`w-full mb-6 ${plan.highlight ? 'bg-teal-500 hover:bg-teal-400 text-black' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                    {plan.cta}
                  </Button>
                </a>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Capture / Contact Form */}
      <section id="contact" className="py-24 px-4 bg-gradient-to-b from-transparent via-teal-500/[0.03] to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {submitted ? 'Thank you!' : 'Ready to transform your operations?'}
            </h2>
            <p className="text-gray-400">
              {submitted
                ? 'We\'ll reach out within 24 hours to schedule your personalized demo.'
                : 'Get a personalized demo and see how OpsCanvas can work for your team.'}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 p-8 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Full Name *</label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Jane Smith"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Work Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Company</label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Acme Corp"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Job Title</label>
                  <Input
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="VP of Operations"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Team Size</label>
                <select
                  value={form.teamSize}
                  onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
                >
                  <option value="" className="bg-gray-900">Select team size</option>
                  <option value="1-10" className="bg-gray-900">1-10 employees</option>
                  <option value="11-50" className="bg-gray-900">11-50 employees</option>
                  <option value="51-200" className="bg-gray-900">51-200 employees</option>
                  <option value="201-1000" className="bg-gray-900">201-1,000 employees</option>
                  <option value="1000+" className="bg-gray-900">1,000+ employees</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">What's your biggest knowledge management challenge?</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your current setup and pain points..."
                  rows={3}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm placeholder:text-gray-600 resize-none"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-teal-500 hover:bg-teal-400 text-black font-semibold py-6 text-lg"
                disabled={submitLead.isPending}
              >
                {submitLead.isPending ? 'Submitting...' : 'Request Your Demo'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-xs text-gray-500 text-center">
                No credit card required. We'll respond within 24 hours.
              </p>
            </form>
          ) : (
            <div className="text-center p-12 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <CheckCircle2 className="w-16 h-16 text-teal-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
              <p className="text-gray-400 mb-6">
                Our team will reach out within 24 hours to schedule your personalized demo.
                In the meantime, feel free to explore the platform.
              </p>
              <Link href="/">
                <Button className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                  Explore the Platform <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={LOGO_IMG} alt="OpsCanvas" className="w-6 h-6 rounded" />
              <span className="font-semibold">OpsCanvas</span>
              <span className="text-gray-500 text-sm">by Riad & Routes</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} OpsCanvas. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
