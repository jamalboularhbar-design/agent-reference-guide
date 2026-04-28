import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Palette, ChevronRight } from 'lucide-react';
import TravelConcierge from '@/components/personas/TravelConcierge';
import CreativeStudio from '@/components/personas/CreativeStudio';
import Header from '@/components/Header';

export default function Home() {
  const [activePersona, setActivePersona] = useState<'travel' | 'artkech'>('travel');

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Header />
      
      <main className="container py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center py-12">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
            <p className="text-sm font-semibold text-accent">Dual Persona System</p>
          </div>
          <h1 className="font-display text-5xl md:text-7xl mb-6 text-foreground leading-tight">
            Agent Reference Guide
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            A comprehensive interactive guide for managing operational processes across your luxury travel company and creative design studio. Seamlessly switch between personas and explore detailed process frameworks.
          </p>
        </div>

        {/* Persona Selection Tabs */}
        <div className="mb-16">
          <Tabs value={activePersona} onValueChange={(value) => setActivePersona(value as 'travel' | 'artkech')} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12 bg-card/50 border border-border/50 p-1 rounded-lg">
              <TabsTrigger value="travel" className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                <span>Luxury Travel</span>
              </TabsTrigger>
              <TabsTrigger value="artkech" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span>ArtKech Studio</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="travel" className="mt-8">
              <TravelConcierge />
            </TabsContent>

            <TabsContent value="artkech" className="mt-8">
              <CreativeStudio />
            </TabsContent>
          </Tabs>
        </div>

        {/* General Capabilities Section */}
        <section className="mt-24 mb-20 pt-12 border-t border-border/50">
          <h2 className="font-display text-4xl md:text-5xl mb-3 text-foreground">General Capabilities</h2>
          <p className="text-muted-foreground mb-8">Core competencies across both business operations</p>
          
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

        {/* Operational Guidelines Section */}
        <section className="mt-24 pt-12 border-t border-border/50">
          <h2 className="font-display text-4xl md:text-5xl mb-3 text-foreground">Operational Guidelines</h2>
          <p className="text-muted-foreground mb-8">Core principles guiding all operations</p>
          
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
