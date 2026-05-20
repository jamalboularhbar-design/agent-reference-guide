import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Plane, Palette, ChevronLeft, ChevronRight, Sun, Snowflake, Leaf, Flower2 } from 'lucide-react';

type Persona = 'riad-routes' | 'artkech';

interface SeasonalEvent {
  month: number; // 1-12
  title: string;
  type: 'peak' | 'low' | 'event' | 'deadline' | 'preparation';
  description: string;
  impact: string;
}

const RR_EVENTS: SeasonalEvent[] = [
  { month: 1, title: 'New Year Peak', type: 'peak', description: 'High occupancy from European winter travelers', impact: 'Staff overtime, premium pricing active' },
  { month: 1, title: 'Winter Pricing Tier', type: 'event', description: 'Mid-season pricing (Oct-Feb) in effect', impact: '15% above base rate' },
  { month: 2, title: 'Valentine\'s Packages', type: 'preparation', description: 'Prepare romantic packages, couples spa, rooftop dinners', impact: 'Coordinate with F&B and spa teams' },
  { month: 3, title: 'Ramadan Preparation', type: 'preparation', description: 'Adjust F&B schedules, prepare Iftar menus, brief staff on cultural protocols', impact: 'Modified breakfast/dinner times, special menus' },
  { month: 3, title: 'Spring Equinox Tours', type: 'event', description: 'Peak season for medina walking tours and Atlas day trips', impact: 'Increase guide availability by 40%' },
  { month: 4, title: 'Ramadan Operations', type: 'event', description: 'Full Ramadan service adjustments — Iftar/Suhoor service, modified housekeeping schedule', impact: 'Adjusted staff shifts, special guest briefing' },
  { month: 4, title: 'Easter Peak', type: 'peak', description: 'European Easter holiday travelers — families and couples', impact: 'Full occupancy expected, waitlist active' },
  { month: 5, title: 'Eid al-Fitr Celebrations', type: 'event', description: 'End of Ramadan celebrations, local festivities, special guest experiences', impact: 'Staff holiday rotation, premium local events' },
  { month: 5, title: 'Spring Peak Season', type: 'peak', description: 'Ideal weather drives highest occupancy of the year', impact: 'Maximum pricing tier, all rooms booked 3+ weeks ahead' },
  { month: 6, title: 'Summer Heat Protocol', type: 'preparation', description: 'Activate summer cooling measures, adjust tour times to early morning/evening', impact: 'Pool/terrace priority, modified excursion schedule' },
  { month: 6, title: 'Fête de la Musique', type: 'event', description: 'Music festival in Marrakech — coordinate guest access to events', impact: 'Arrange tickets, transport to venues' },
  { month: 7, title: 'Low Season Begins', type: 'low', description: 'Summer heat reduces European tourism — focus on Gulf/domestic travelers', impact: 'Reduced pricing, maintenance window opens' },
  { month: 7, title: 'Staff Training Window', type: 'preparation', description: 'Use low occupancy for deep training, facility upgrades, deep cleaning', impact: '2-week intensive training program' },
  { month: 8, title: 'Maintenance & Renovation', type: 'preparation', description: 'Annual deep maintenance — repaint, fix plumbing, update furnishings', impact: 'Partial closure possible, contractor coordination' },
  { month: 9, title: 'Autumn Recovery', type: 'event', description: 'Bookings begin climbing as temperatures cool', impact: 'Reactivate full staffing, update OTA listings' },
  { month: 10, title: 'High Season Launch', type: 'peak', description: 'October marks return of peak European travel season', impact: 'Premium pricing, full staff roster activated' },
  { month: 10, title: 'Marrakech Film Festival Prep', type: 'preparation', description: 'Prepare for international film festival guests — VIP protocols', impact: 'Celebrity handling, media coordination' },
  { month: 11, title: 'Film Festival', type: 'event', description: 'Marrakech International Film Festival — high-profile guests', impact: 'VIP protocols active, premium services' },
  { month: 11, title: 'Year-End Planning', type: 'deadline', description: 'Budget planning, supplier contract renewals, staff evaluations', impact: 'Admin-heavy period, schedule management meetings' },
  { month: 12, title: 'Holiday Season Peak', type: 'peak', description: 'Christmas/New Year period — highest rates, full occupancy', impact: 'All hands on deck, festive decorations, special menus' },
  { month: 12, title: 'NYE Gala Preparation', type: 'preparation', description: 'Plan and execute New Year\'s Eve celebration for guests', impact: 'Entertainment booking, special menu, late-night service' },
];

const AK_EVENTS: SeasonalEvent[] = [
  { month: 1, title: 'Q1 Campaign Season Opens', type: 'peak', description: 'Clients launch new year campaigns — heavy brief intake period', impact: 'All designers at full capacity' },
  { month: 1, title: 'Portfolio Refresh', type: 'preparation', description: 'Update portfolio site and case studies with previous year\'s best work', impact: 'Marketing team focus, 2-week project' },
  { month: 2, title: 'Valentine\'s Campaign Delivery', type: 'deadline', description: 'All Valentine\'s Day marketing materials must ship by Feb 1', impact: 'Rush production, overtime likely' },
  { month: 2, title: 'Annual Client Reviews', type: 'event', description: 'Schedule annual review meetings with retainer clients', impact: 'Account managers fully booked' },
  { month: 3, title: 'Ramadan Campaign Design', type: 'peak', description: 'Heavy demand for Ramadan-themed marketing materials, social content, packaging', impact: 'Cultural sensitivity review required on all work' },
  { month: 3, title: 'Print Production Rush', type: 'deadline', description: 'All Ramadan print materials must be at printer by mid-March', impact: 'Pre-flight checks critical, no room for reprints' },
  { month: 4, title: 'Eid Campaign Delivery', type: 'deadline', description: 'Eid al-Fitr celebration materials delivery deadline', impact: 'Social media kits, packaging, POS materials' },
  { month: 4, title: 'Spring Collection Shoots', type: 'event', description: 'Fashion/retail clients need spring lookbook photography', impact: 'Studio booked for shoots, freelance photographers needed' },
  { month: 5, title: 'Summer Campaign Briefs', type: 'peak', description: 'Tourism and hospitality clients brief summer campaigns', impact: 'Heavy concept development phase' },
  { month: 5, title: 'Design Awards Submission', type: 'deadline', description: 'Submit best work to regional and international design awards', impact: 'Case study preparation, entry fees budgeted' },
  { month: 6, title: 'Mid-Year Financial Review', type: 'event', description: 'Review H1 revenue, adjust H2 pricing, assess freelancer costs', impact: 'Finance focus, possible rate adjustments' },
  { month: 6, title: 'Eid al-Adha Materials', type: 'deadline', description: 'Eid al-Adha campaign materials delivery', impact: 'Greeting cards, social media, corporate gifts design' },
  { month: 7, title: 'Summer Slowdown', type: 'low', description: 'Client activity drops as decision-makers take holidays', impact: 'Focus on internal projects, training, portfolio' },
  { month: 7, title: 'Intern Season', type: 'preparation', description: 'Onboard summer interns, assign mentors and training projects', impact: 'Senior designers mentor, reduced billable hours' },
  { month: 8, title: 'Back-to-School Campaign Prep', type: 'preparation', description: 'Education and retail clients brief back-to-school campaigns', impact: 'Concept development, early production start' },
  { month: 8, title: 'Equipment & Software Renewal', type: 'event', description: 'Annual Adobe/Figma license renewals, hardware assessment', impact: 'Budget allocation, procurement process' },
  { month: 9, title: 'Q4 Campaign Rush Begins', type: 'peak', description: 'Busiest quarter — holiday campaigns, year-end promotions, annual reports', impact: 'Maximum capacity, freelancer roster activated' },
  { month: 9, title: 'Annual Report Season', type: 'event', description: 'Corporate clients commission annual reports and sustainability reports', impact: 'Long-form design projects, 4-6 week timelines' },
  { month: 10, title: 'Holiday Campaign Production', type: 'peak', description: 'Black Friday, Christmas, NYE campaign materials in production', impact: 'Multiple concurrent deadlines, strict QA needed' },
  { month: 10, title: 'New Business Push', type: 'preparation', description: 'Proactive outreach to prospects for Q1 retainer contracts', impact: 'Business dev focus, proposal writing' },
  { month: 11, title: 'Print Deadline Crunch', type: 'deadline', description: 'All holiday print materials must be at printer by mid-November', impact: 'No margin for error, pre-flight critical' },
  { month: 11, title: 'Year-End Client Gifts', type: 'preparation', description: 'Design and produce branded client appreciation gifts', impact: 'Internal project, showcase creativity' },
  { month: 12, title: 'Holiday Skeleton Crew', type: 'low', description: 'Reduced operations during holiday period, emergency-only client work', impact: 'Staff rotation, office closure Dec 25-Jan 2' },
  { month: 12, title: 'Year-End Wrap & Planning', type: 'event', description: 'Annual review, goal setting for next year, team celebration', impact: 'Strategy sessions, budget planning, team bonding' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SeasonalCalendarPage() {
  const [, navigate] = useLocation();
  const [activePersona, setActivePersona] = useState<Persona>('riad-routes');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const events = activePersona === 'riad-routes' ? RR_EVENTS : AK_EVENTS;

  const monthEvents = useMemo(() => events.filter(e => e.month === selectedMonth), [events, selectedMonth]);

  const typeColor = (type: string) => {
    switch (type) {
      case 'peak': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'low': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'event': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'deadline': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'preparation': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const seasonIcon = (month: number) => {
    if (month >= 3 && month <= 5) return <Flower2 className="w-4 h-4 text-pink-400" />;
    if (month >= 6 && month <= 8) return <Sun className="w-4 h-4 text-amber-400" />;
    if (month >= 9 && month <= 11) return <Leaf className="w-4 h-4 text-orange-400" />;
    return <Snowflake className="w-4 h-4 text-blue-400" />;
  };

  const yearOverview = useMemo(() => {
    return MONTHS.map((name, i) => ({
      name,
      month: i + 1,
      eventCount: events.filter(e => e.month === i + 1).length,
      hasPeak: events.some(e => e.month === i + 1 && e.type === 'peak'),
      hasDeadline: events.some(e => e.month === i + 1 && e.type === 'deadline'),
    }));
  }, [events]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Calendar className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold">Seasonal Operations Calendar</h1>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Persona Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActivePersona('riad-routes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${activePersona === 'riad-routes' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:border-accent/50'}`}
          >
            <Plane className="w-4 h-4" /> Riad & Routes
          </button>
          <button
            onClick={() => setActivePersona('artkech')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${activePersona === 'artkech' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:border-accent/50'}`}
          >
            <Palette className="w-4 h-4" /> ArtKech Studio
          </button>
        </div>

        {/* Year Overview Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {yearOverview.map(m => (
            <button
              key={m.month}
              onClick={() => setSelectedMonth(m.month)}
              className={`p-3 rounded-lg border text-center transition-all ${selectedMonth === m.month ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-border hover:border-accent/50'}`}
            >
              <p className="text-xs font-medium">{m.name.slice(0, 3)}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {m.hasPeak && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                {m.hasDeadline && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                <span className="text-xs text-muted-foreground">{m.eventCount}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Month Detail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedMonth(prev => prev <= 1 ? 12 : prev - 1)} className="p-1 rounded hover:bg-muted">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {seasonIcon(selectedMonth)}
                {MONTHS[selectedMonth - 1]}
              </h2>
              <button onClick={() => setSelectedMonth(prev => prev >= 12 ? 1 : prev + 1)} className="p-1 rounded hover:bg-muted">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Badge variant="secondary">{monthEvents.length} events</Badge>
          </div>

          {monthEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No scheduled events for this month.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {monthEvents.map((event, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={typeColor(event.type)}>{event.type}</Badge>
                          <h3 className="font-medium text-sm">{event.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-accent/80 mt-1.5">Impact: {event.impact}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">Legend:</span>
          {[{ type: 'peak', label: 'Peak Season' }, { type: 'low', label: 'Low Season' }, { type: 'event', label: 'Event' }, { type: 'deadline', label: 'Deadline' }, { type: 'preparation', label: 'Preparation' }].map(l => (
            <Badge key={l.type} className={`text-xs ${typeColor(l.type)}`}>{l.label}</Badge>
          ))}
        </div>
      </main>
    </div>
  );
}
