import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Palette, ChevronRight } from 'lucide-react';
import TravelConcierge from '@/components/personas/TravelConcierge';
import CreativeStudio from '@/components/personas/CreativeStudio';
import Header from '@/components/Header';
import Search from '@/components/Search';
import CommandPalette from '@/components/CommandPalette';
import ProcessTimeline from '@/components/ProcessTimeline';
import DocumentLibrary from '@/components/DocumentLibrary';
import DocumentStats from '@/components/DocumentStats';
import RecentlyViewed from '@/components/RecentlyViewed';
import Favorites from '@/components/Favorites';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import PopularDocuments from '@/components/PopularDocuments';
import TrendingDocumentsSection from '@/components/TrendingDocumentsSection';
import ReadingStreak from '@/components/ReadingStreak';
import SmartSuggestions from '@/components/SmartSuggestions';
import PinnedDocuments from '@/components/PinnedDocuments';
import StickyHeader from '@/components/StickyHeader';
import { generatePersonaContent, exportToPDF } from '@/lib/exportPdf';

export default function Home() {
  const [activePersona, setActivePersona] = useState<'travel' | 'artkech'>('travel');
  const [showSearch, setShowSearch] = useState(false);

  const handleExport = () => {
    const content = generatePersonaContent(activePersona);
    exportToPDF(activePersona, content);
  };

  const travelStages = [
    {
      number: 1,
      title: 'Inquiry & Qualification',
      description: 'Receive initial inquiry, assess client profile (net worth, travel history, preferences), and determine fit for exclusive services.',
      details: ['Profile assessment', 'Service fit analysis', 'Initial consultation scheduling']
    },
    {
      number: 2,
      title: 'Consultation & Proposal',
      description: 'Conduct detailed consultation to understand specific desires. Present high-level, bespoke itinerary proposal highlighting unique experiences.',
      details: ['Detailed needs assessment', 'Proposal development', 'Exclusive access planning']
    },
    {
      number: 3,
      title: 'Itinerary Refinement',
      description: 'Iterate on proposal based on client feedback, securing tentative holds on luxury accommodations and exclusive access.',
      details: ['Feedback integration', 'Accommodation holds', 'Experience confirmation']
    },
    {
      number: 4,
      title: 'Booking & Confirmation',
      description: 'Finalize all bookings (private jets, riads, dining, tours). Provide comprehensive, polished itinerary document.',
      details: ['Final bookings', 'Itinerary documentation', 'Special requests confirmation']
    },
    {
      number: 5,
      title: 'Pre-Trip Preparation',
      description: 'Coordinate logistics, share packing recommendations, ensure all special requests (dietary, security) are communicated to partners.',
      details: ['Logistics coordination', 'Packing guidance', 'Partner communication']
    },
    {
      number: 6,
      title: 'In-Trip Concierge',
      description: 'Provide 24/7 support, manage real-time adjustments, ensure flawless execution of all planned activities.',
      details: ['24/7 availability', 'Real-time support', 'Activity management']
    },
    {
      number: 7,
      title: 'Post-Trip Follow-up',
      description: 'Gather feedback, update client profile with preferences learned during trip, nurture relationship for future travel.',
      details: ['Feedback collection', 'Profile updates', 'Relationship nurturing']
    }
  ];

  const artkechStages = [
    {
      number: 1,
      title: 'Discovery & Briefing',
      description: 'Understand client vision, target audience, and the specific "reader problem" the project aims to solve.',
      details: ['Vision alignment', 'Audience analysis', 'Problem identification']
    },
    {
      number: 2,
      title: 'Strategy & Concept',
      description: 'Develop brand identity or editorial strategy. Present initial concepts focusing on premium aesthetics and market positioning.',
      details: ['Strategy development', 'Concept creation', 'Market positioning']
    },
    {
      number: 3,
      title: 'Design & Development',
      description: 'Execute design work (editorial layout, brand assets). Ensure meticulous attention to detail and premium standard alignment.',
      details: ['Design execution', 'Asset creation', 'Quality assurance']
    },
    {
      number: 4,
      title: 'Production & Photography',
      description: 'Coordinate and direct photography or asset creation. Ensure all visual elements meet the studio\'s high-quality bar.',
      details: ['Photography direction', 'Asset production', 'Quality standards']
    },
    {
      number: 5,
      title: 'Review & Refinement',
      description: 'Present near-final designs to client. Incorporate feedback while maintaining premium design integrity.',
      details: ['Design presentation', 'Feedback integration', 'Refinement iterations']
    },
    {
      number: 6,
      title: 'Pre-Press & Publishing',
      description: 'Prepare files for print, select premium materials (paper, binding), oversee printing process to guarantee "shelf presence."',
      details: ['File preparation', 'Material selection', 'Print oversight']
    },
    {
      number: 7,
      title: 'Delivery & Launch',
      description: 'Deliver final physical or digital products. Provide guidance on launch strategies to maximize impact and perceived value.',
      details: ['Product delivery', 'Launch strategy', 'Impact maximization']
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <StickyHeader>
        <Header />
      </StickyHeader>
      
      <main className="container py-12">
        {/* Top toolbar */}
        <div className="flex items-center justify-between mb-12 gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-3xl mb-1 text-foreground">Reference Guide</h2>
            <p className="text-muted-foreground text-sm">Operational processes & best practices</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-3 py-2 rounded-lg bg-card border border-border/50 text-muted-foreground hover:border-accent/50 transition-colors text-sm"
            >
              🔍 Search
            </button>
            <CommandPalette onExport={handleExport} onSwitchPersona={setActivePersona} />
          </div>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <Card className="card-premium mb-12">
            <CardHeader>
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>Search across all personas, processes, and guidelines</CardDescription>
            </CardHeader>
            <CardContent>
              <Search />
            </CardContent>
          </Card>
        )}

        {/* Hero Section */}
        <div className="mb-10 sm:mb-16 text-center py-8 sm:py-12">
          <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-accent/10 border border-accent/20">
            <p className="text-xs sm:text-sm font-semibold text-accent">Dual Persona System</p>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl mb-4 sm:mb-6 text-foreground leading-tight">
            ARG Builder
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
            A comprehensive interactive guide for managing operational processes across Riad & Routes and your creative design studio. Seamlessly switch between personas and explore detailed process frameworks.
          </p>
          <div className="max-w-lg mx-auto" data-tour="search">
            <SearchAutocomplete placeholder="Quick search 525+ documents..." className="text-left" />
          </div>
        </div>

        {/* Persona Selection Tabs */}
        <div className="mb-10 sm:mb-16">
          <Tabs value={activePersona} onValueChange={(value) => setActivePersona(value as 'travel' | 'artkech')} className="w-full">
            <TabsList data-tour="personas" className="grid w-full max-w-sm sm:max-w-md mx-auto grid-cols-2 mb-8 sm:mb-12 bg-card/50 border border-border/50 p-1 rounded-lg">
              <TabsTrigger value="travel" className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                <span>Riad & Routes</span>
              </TabsTrigger>
              <TabsTrigger value="artkech" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span>ArtKech Studio</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="travel" className="mt-8 space-y-8">
              <TravelConcierge />
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle>Process Timeline</CardTitle>
                  <CardDescription>7-stage operational workflow</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProcessTimeline stages={travelStages} title="Riad & Routes Concierge Process" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="artkech" className="mt-8 space-y-8">
              <CreativeStudio />
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle>Process Timeline</CardTitle>
                  <CardDescription>7-stage operational workflow</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProcessTimeline stages={artkechStages} title="ArtKech Design Process" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* General Capabilities Section */}
        <section className="mt-16 sm:mt-24 mb-12 sm:mb-20 pt-8 sm:pt-12 border-t border-border/50">
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 text-foreground">General Capabilities</h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">Core competencies across both business operations</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Context Switching',
                description: 'Seamlessly transition between personas based on task context'
              },
              {
                title: 'Client Communication',
                description: 'Professional interactions with exceptional service focus'
              },
              {
                title: 'Project Management',
                description: 'Track progress, manage timelines, allocate resources'
              },
              {
                title: 'Information Synthesis',
                description: 'Access and process information from multiple sources'
              },
              {
                title: 'Automation & Efficiency',
                description: 'Streamline workflows and improve operational efficiency'
              },
              {
                title: 'Quality Assurance',
                description: 'Ensure deliverables meet highest standards'
              }
            ].map((capability, index) => (
              <Card key={index} className="card-premium">
                <CardHeader>
                  <CardTitle className="text-lg">{capability.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{capability.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pinned Documents */}
        <PinnedDocuments />

        {/* Reading Streak */}
        <section className="mt-8">
          <ReadingStreak />
        </section>

        {/* Smart Suggestions */}
        <section className="mt-6">
          <SmartSuggestions />
        </section>

        {/* Favorites & Recently Viewed */}
        <Favorites />
        <RecentlyViewed />

        {/* Popular/Trending Documents */}
        <PopularDocuments />

        {/* Trending Now (weighted recency) */}
        <TrendingDocumentsSection />

        {/* Document Statistics */}
        <section className="mt-16">
          <DocumentStats />
        </section>

        {/* Document Library Section */}
        <div data-tour="library">
          <DocumentLibrary />
        </div>

        {/* Operational Guidelines Section */}
        <section className="mt-16 sm:mt-24 pt-8 sm:pt-12 border-t border-border/50">
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 text-foreground">Operational Guidelines</h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">Core principles guiding all operations</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Prioritization',
                description: 'Tasks prioritized by urgency, client value, and strategic importance'
              },
              {
                title: 'Confidentiality',
                description: 'All client information handled with utmost security'
              },
              {
                title: 'Brand Alignment',
                description: 'Communications adhere to brand voice and quality standards'
              },
              {
                title: 'Escalation',
                description: 'Complex issues promptly escalated to appropriate team members'
              },
              {
                title: 'Feedback Integration',
                description: 'Continuously improve through client and team feedback'
              },
              {
                title: 'Proactive Problem Solving',
                description: 'Identify issues before they arise and implement preventative measures'
              }
            ].map((guideline, index) => (
              <Card key={index} className="card-premium">
                <CardHeader>
                  <CardTitle className="text-lg">{guideline.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{guideline.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
