import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Link } from 'wouter';
import {
  BookOpen, Brain, BarChart3, Shield, Users, Zap,
  CheckCircle2, ArrowRight, Star, ChevronRight, Sparkles, Loader2,
  Network, Clock, Search, FileText, Lock, Globe,
  Building2, Hotel, Stethoscope, ShoppingBag, Factory, Briefcase,
  Layers, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const HERO_IMG = '/manus-storage/hero-dashboard_9f31bf62.png';
const KNOWLEDGE_GRAPH_IMG = '/manus-storage/feature-knowledge-graph_ed196875.png';
const ANALYTICS_IMG = '/manus-storage/feature-analytics_315c687f.png';
const AI_ASSISTANT_IMG = '/manus-storage/feature-ai-assistant_1c6d801e.png';
const LOGO_IMG = '/manus-storage/logo-icon_7cc98e89.png';

const VERTICALS = [
  { icon: Hotel, name: 'Hospitality', desc: 'Hotels, resorts, and restaurant groups', color: 'text-amber-400' },
  { icon: Stethoscope, name: 'Healthcare', desc: 'Clinics, hospitals, and care networks', color: 'text-rose-400' },
  { icon: Briefcase, name: 'Professional Services', desc: 'Consulting, legal, and accounting firms', color: 'text-blue-400' },
  { icon: ShoppingBag, name: 'Retail & E-Commerce', desc: 'Multi-location retail and DTC brands', color: 'text-purple-400' },
  { icon: Factory, name: 'Manufacturing', desc: 'Production, quality, and supply chain', color: 'text-orange-400' },
  { icon: Building2, name: 'SaaS & Technology', desc: 'Product, engineering, and CS teams', color: 'text-cyan-400' },
];

export default function LandingPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: false });
  const submitLead = trpc.leads.submit.useMutation();
  const { data: stripeConfig } = trpc.stripe.isConfigured.useQuery();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast.info('Redirecting to checkout...');
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [form, setForm] = useState({
    fullName: '', email: '', company: '', jobTitle: '', teamSize: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  // SEO meta tags for /product page
  useEffect(() => {
    document.title = 'ARG Builder Product — AI Operational Intelligence for Mid-Market';

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = 'ARG Builder delivers AI-powered operational intelligence for mid-market companies across hospitality, healthcare, professional services, retail, manufacturing, and SaaS. Starting at $299/mo.';

    // Meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = 'operational intelligence platform, mid-market SaaS, AI knowledge management, workflow automation, ARG Builder pricing, business process AI, operational reference guide';

    // Open Graph meta tags
    const ogImageUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663609289051/2ZSCuHTjdaVo7h4vqS7dZB/og-image-argbuilder-ZutmaYZHU87mr4cVDB2dma.png';
    const ogTags: Record<string, string> = {
      'og:type': 'product',
      'og:url': `${window.location.origin}/product`,
      'og:title': 'ARG Builder — AI Operational Intelligence for Mid-Market Companies',
      'og:description': 'Automate operational processes with AI-powered reference guides, knowledge management, and workflow intelligence. 6 verticals. Starting at $299/mo.',
      'og:site_name': 'ARG Builder',
      'og:image': ogImageUrl,
      'og:image:width': '2560',
      'og:image:height': '1440',
    };
    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    });

    // Twitter Card meta tags
    const twitterTags: Record<string, string> = {
      'twitter:card': 'summary_large_image',
      'twitter:title': 'ARG Builder — AI Operational Intelligence for Mid-Market',
      'twitter:description': 'AI-powered operational intelligence for mid-market companies. 6 verticals, starting at $299/mo.',
      'twitter:image': ogImageUrl,
    };
    Object.entries(twitterTags).forEach(([name, content]) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    });

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/product`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      toast.error('Please fill in your name and email');
      return;
    }
    try {
      await submitLead.mutateAsync({ ...form, source: 'landing_page' });
      setSubmitted(true);
      setForm({ fullName: '', email: '', company: '', jobTitle: '', teamSize: '', message: '' });
      toast.success('Demo request submitted successfully!');
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
            <img src={LOGO_IMG} alt="ARG Builder" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold tracking-tight">ARG Builder</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#vision" className="hover:text-white transition-colors">Vision</a>
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#verticals" className="hover:text-white transition-colors">Verticals</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/roi" className="hover:text-white transition-colors">ROI Calculator</Link>
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
              <span className="text-sm font-medium text-teal-300">AI-Powered Operational Intelligence for Every Vertical</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
              We build the AI that<br />
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
                runs your operations
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              ARG Builder creates AI-powered operational intelligence platforms tailored to your industry. We turn scattered SOPs, playbooks, and tribal knowledge into living systems your entire team can trust — from hospitality to healthcare, SaaS to manufacturing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-8 py-6 text-lg">
                  Request Early Access <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <a href="#platform">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 px-8 py-6 text-lg">
                  See the Platform
                </Button>
              </a>
            </div>
          </div>
          {/* Hero Image */}
          <div className="relative mt-16 mx-auto max-w-5xl">
            <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-cyan-500/10 to-purple-500/20 rounded-2xl blur-3xl" />
            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={HERO_IMG} alt="ARG Builder Platform" className="w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-24 px-4 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium mb-6">
            <Rocket className="w-3 h-3" /> The Big Vision
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            One engine. Every vertical.<br />
            <span className="text-teal-400">Infinite operational intelligence.</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Mid-market companies across every industry share the same problem: operational knowledge is scattered, outdated, and impossible to find. Enterprise tools are too expensive and complex. Generic wikis don't understand your workflows. ARG Builder fills this gap with AI-native platforms purpose-built for each vertical.
          </p>

          {/* Problem Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

          {/* Platform Stats */}
          <div className="flex flex-wrap justify-center gap-8 py-4 px-6 rounded-xl bg-white/[0.03] border border-white/5">
            {[
              { value: '288', label: 'Features Shipped' },
              { value: '92', label: 'Database Tables' },
              { value: '299', label: 'Tests Passing' },
              { value: '6', label: 'Verticals Ready' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-bold text-teal-400">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verticals Section */}
      <section id="verticals" className="py-24 px-4 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4">
              <span className="text-xs font-medium text-teal-300">INDUSTRY VERTICALS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for your industry, not against it</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Each ARG Builder deployment is tailored to your vertical with industry-specific templates, workflows, compliance frameworks, and AI models that understand your domain.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VERTICALS.map((v, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/[0.03] border border-white/5 hover:border-teal-500/20 transition-colors group">
                <v.icon className={`w-10 h-10 ${v.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="text-lg font-semibold mb-2">{v.name}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{v.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Learn more</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="platform" className="py-24 px-4 bg-gradient-to-b from-transparent via-teal-500/[0.03] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4">
              <Layers className="w-3 h-3 text-teal-300" />
              <span className="text-xs font-medium text-teal-300">THE ARG BUILDER ENGINE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">The platform powering it all</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">Every vertical deployment is built on the same battle-tested engine — AI-powered search, knowledge graphs, analytics, and governance tools that adapt to your domain.</p>
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
                <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Operational Analytics</span>
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

          {/* Feature 3: AI Governance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">AI Content Governance</span>
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
              <img src={AI_ASSISTANT_IMG} alt="AI Governance" className="relative rounded-xl border border-white/10 shadow-xl w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Capability Grid */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">And so much more</h2>
            <p className="text-gray-400">Every feature your operations team has been asking for — built into the core engine.</p>
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
            <p className="text-gray-400 max-w-2xl mx-auto">ARG Builder is designed for fast deployment. Import your existing docs, configure your workflows, and start seeing value immediately.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Choose Your Vertical', desc: 'Select your industry. We configure templates, workflows, and AI models for your domain.' },
              { step: '02', title: 'Import & Organize', desc: 'Bulk import from Google Docs, Notion, Confluence, or plain files. AI auto-categorizes everything.' },
              { step: '03', title: 'Configure & Brand', desc: 'Set up personas, permissions, and branding. Make it yours in minutes, not weeks.' },
              { step: '04', title: 'Launch & Measure', desc: 'Invite your team. Track adoption with real-time analytics. AI surfaces what needs attention.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-teal-500/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
                {i < 3 && <ChevronRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-teal-500/20" />}
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
            <p className="text-gray-400">Start with a pilot. Scale when you're ready. Every plan includes your vertical configuration.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: '$299',
                period: '/month',
                desc: 'For small teams and departments',
                subtext: 'Up to 25 users included',
                features: ['Up to 25 users', 'AI-powered document generation', 'Full-text search', 'Basic analytics', '3 custom workflows', 'Knowledge graph (read-only)', '14-day free trial'],
                cta: 'Start Free Trial',
                highlight: false,
              },
              {
                name: 'Professional',
                price: '$15',
                period: '/user/month',
                desc: 'For growing mid-market teams',
                subtext: '25-seat minimum · $12/user billed annually',
                features: ['Everything in Starter', 'Interactive knowledge graph', 'Duplicate detection', 'Approval workflows', 'Advanced analytics', 'SSO / SAML', 'Custom branding', 'Priority support'],
                cta: 'Start Free Trial',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'For organizations at scale',
                subtext: 'Starting at $2,500/month',
                features: ['Everything in Professional', 'Custom AI model training', 'On-premise deployment', 'Custom integrations & API', 'Compliance (SOC 2, HIPAA)', 'Multi-workspace', '24/7 white-glove support', 'Quarterly business reviews'],
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
                <p className="text-sm text-gray-400 mb-1">{plan.desc}</p>
                {(plan as any).subtext && <p className="text-xs text-gray-500 mb-6">{(plan as any).subtext}</p>}
                {!(plan as any).subtext && <div className="mb-6" />}
                <div>
                  <Button
                    className={`w-full mb-6 ${plan.highlight ? 'bg-teal-500 hover:bg-teal-400 text-black' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
                    onClick={() => {
                      if (plan.name === 'Enterprise') {
                        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                      } else if (stripeConfig?.configured && user) {
                        createCheckout.mutate({
                          tierId: plan.name.toLowerCase() as 'starter' | 'professional',
                          billingPeriod: 'monthly',
                        });
                      } else {
                        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending ? 'Processing...' : plan.cta}
                  </Button>
                </div>
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
                : 'Get a personalized demo tailored to your industry and see how ARG Builder can work for your team.'}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 p-8 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demo-fullname" className="block text-sm text-gray-400 mb-1.5">Full Name *</label>
                  <Input
                    id="demo-fullname"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Jane Smith"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="demo-email" className="block text-sm text-gray-400 mb-1.5">Work Email *</label>
                  <Input
                    id="demo-email"
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
                  <label htmlFor="demo-company" className="block text-sm text-gray-400 mb-1.5">Company</label>
                  <Input
                    id="demo-company"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Acme Corp"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="demo-jobtitle" className="block text-sm text-gray-400 mb-1.5">Job Title</label>
                  <Input
                    id="demo-jobtitle"
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="VP of Operations"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="industry-select" className="block text-sm text-gray-400 mb-1.5">Industry</label>
                <select
                  id="industry-select"
                  value={form.teamSize}
                  onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
                  aria-label="Select your industry"
                >
                  <option value="" className="bg-gray-900">Select your industry</option>
                  <option value="hospitality" className="bg-gray-900">Hospitality & Travel</option>
                  <option value="healthcare" className="bg-gray-900">Healthcare</option>
                  <option value="professional-services" className="bg-gray-900">Professional Services</option>
                  <option value="retail" className="bg-gray-900">Retail & E-Commerce</option>
                  <option value="manufacturing" className="bg-gray-900">Manufacturing</option>
                  <option value="saas" className="bg-gray-900">SaaS & Technology</option>
                  <option value="other" className="bg-gray-900">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="demo-challenge" className="block text-sm text-gray-400 mb-1.5">What's your biggest operational challenge?</label>
                <textarea
                  id="demo-challenge"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your current setup and pain points..."
                  rows={3}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm placeholder:text-gray-600 resize-none"
                  aria-label="Describe your biggest operational challenge"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-teal-500 hover:bg-teal-400 text-black font-semibold py-6 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={submitLead.isPending}
              >
                {submitLead.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending your request...
                  </>
                ) : (
                  <>
                    Request Your Demo
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                No credit card required. We'll respond within 24 hours.
              </p>
            </form>
          ) : (
            <div className="text-center p-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-teal-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
              <p className="text-gray-400 mb-2">
                Your demo request has been received and sent to our team.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                We'll reach out within 24 hours to schedule your personalized walkthrough.
                Check your inbox for a confirmation email.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                    Explore the Platform <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5"
                  onClick={() => setSubmitted(false)}
                >
                  Submit Another Request
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_IMG} alt="ARG Builder" className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold">ARG Builder</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-4 max-w-md">
                AI-powered operational intelligence platforms tailored to every industry vertical. We build the systems that run your operations — from hospitality to healthcare, SaaS to manufacturing.
              </p>
              <p className="text-xs text-gray-600">argbuilder.io</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-300">Platform</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-500">
                <a href="#platform" className="hover:text-white transition-colors">Features</a>
                <a href="#verticals" className="hover:text-white transition-colors">Verticals</a>
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                <Link href="/roi" className="hover:text-white transition-colors">ROI Calculator</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-300">Company</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-500">
                <a href="#vision" className="hover:text-white transition-colors">Our Vision</a>
                <a href="#contact" className="hover:text-white transition-colors">Request Demo</a>
                <Link href="/" className="hover:text-white transition-colors">Reference Guide</Link>
                <span className="text-gray-600 cursor-default">Careers (Coming Soon)</span>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} ARG Builder. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <span>hello@argbuilder.io</span>
              <span>·</span>
              <span>New York · San Francisco</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
