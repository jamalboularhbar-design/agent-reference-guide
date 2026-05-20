import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckSquare, Square, Clock, Sun, Moon, Coffee, Plane, Palette, Calendar, RotateCcw } from 'lucide-react';

type Persona = 'riad-routes' | 'artkech';
type TimeOfDay = 'morning' | 'afternoon' | 'evening';

interface ChecklistItem {
  id: string;
  task: string;
  timeSlot: TimeOfDay;
  priority: 'high' | 'medium' | 'low';
  duration: string;
  responsible: string;
  sourceDoc?: string;
}

const RR_CHECKLISTS: ChecklistItem[] = [
  { id: 'rr1', task: 'Review overnight guest messages & WhatsApp inquiries', timeSlot: 'morning', priority: 'high', duration: '15 min', responsible: 'Front Desk', sourceDoc: 'WhatsApp Concierge Communication Standards' },
  { id: 'rr2', task: 'Verify today\'s check-in list and prepare welcome amenities', timeSlot: 'morning', priority: 'high', duration: '20 min', responsible: 'Front Desk', sourceDoc: 'Guest Check-In Protocol' },
  { id: 'rr3', task: 'Assign housekeeping rotation for departing rooms', timeSlot: 'morning', priority: 'high', duration: '10 min', responsible: 'Head Housekeeper', sourceDoc: 'Housekeeping Daily Rotation' },
  { id: 'rr4', task: 'Confirm driver assignments for airport transfers', timeSlot: 'morning', priority: 'high', duration: '15 min', responsible: 'Operations Manager', sourceDoc: 'Driver Dispatch & Fleet Management' },
  { id: 'rr5', task: 'Brief kitchen on dietary requirements for today\'s guests', timeSlot: 'morning', priority: 'medium', duration: '10 min', responsible: 'F&B Manager', sourceDoc: 'Food & Beverage Daily Operations' },
  { id: 'rr6', task: 'Check hammam/spa booking schedule and prepare treatments', timeSlot: 'morning', priority: 'medium', duration: '15 min', responsible: 'Spa Coordinator', sourceDoc: 'Hammam & Spa Operations' },
  { id: 'rr7', task: 'Confirm medina tour guide availability for booked tours', timeSlot: 'morning', priority: 'medium', duration: '10 min', responsible: 'Tour Coordinator', sourceDoc: 'Medina Tour Guide Briefing & Quality Standards' },
  { id: 'rr8', task: 'Process guest check-ins with welcome ritual', timeSlot: 'afternoon', priority: 'high', duration: '30 min', responsible: 'Front Desk', sourceDoc: 'Guest Check-In Protocol' },
  { id: 'rr9', task: 'Inspect turned rooms for quality standards', timeSlot: 'afternoon', priority: 'high', duration: '45 min', responsible: 'Head Housekeeper', sourceDoc: 'Housekeeping Daily Rotation' },
  { id: 'rr10', task: 'Follow up on any pending guest complaints', timeSlot: 'afternoon', priority: 'high', duration: '20 min', responsible: 'Guest Relations', sourceDoc: 'Guest Complaint Resolution' },
  { id: 'rr11', task: 'Review online reviews and respond to new ones', timeSlot: 'afternoon', priority: 'medium', duration: '30 min', responsible: 'Marketing', sourceDoc: 'Online Reputation & Review Management' },
  { id: 'rr12', task: 'Check VIP arrivals for next 48 hours and prepare upgrades', timeSlot: 'afternoon', priority: 'medium', duration: '20 min', responsible: 'Guest Relations', sourceDoc: 'VIP Guest Handling Protocol' },
  { id: 'rr13', task: 'Verify tomorrow\'s tour bookings and confirmations', timeSlot: 'afternoon', priority: 'medium', duration: '15 min', responsible: 'Tour Coordinator', sourceDoc: 'Tour Booking & Confirmation Workflow' },
  { id: 'rr14', task: 'Process guest checkouts and collect feedback', timeSlot: 'evening', priority: 'high', duration: '20 min', responsible: 'Front Desk', sourceDoc: 'Guest Departure & Checkout Process' },
  { id: 'rr15', task: 'Complete night audit and reconcile daily revenue', timeSlot: 'evening', priority: 'high', duration: '45 min', responsible: 'Night Auditor', sourceDoc: 'Night Audit & Security Procedures' },
  { id: 'rr16', task: 'Security walkthrough and lock-up procedures', timeSlot: 'evening', priority: 'high', duration: '20 min', responsible: 'Security', sourceDoc: 'Night Audit & Security Procedures' },
  { id: 'rr17', task: 'Update supplier payment tracker for due invoices', timeSlot: 'evening', priority: 'low', duration: '15 min', responsible: 'Finance', sourceDoc: 'Supplier Payment & Procurement' },
  { id: 'rr18', task: 'Prepare handover notes for morning shift', timeSlot: 'evening', priority: 'medium', duration: '10 min', responsible: 'Night Manager', sourceDoc: 'Night Audit & Security Procedures' },
];

const AK_CHECKLISTS: ChecklistItem[] = [
  { id: 'ak1', task: 'Review overnight client messages and urgent requests', timeSlot: 'morning', priority: 'high', duration: '15 min', responsible: 'Studio Manager', sourceDoc: 'Studio Daily Operations & Time Management' },
  { id: 'ak2', task: 'Daily standup: review active projects and blockers', timeSlot: 'morning', priority: 'high', duration: '15 min', responsible: 'Creative Director', sourceDoc: 'Studio Daily Operations & Time Management' },
  { id: 'ak3', task: 'Check freelancer deliverables due today', timeSlot: 'morning', priority: 'high', duration: '10 min', responsible: 'Project Manager', sourceDoc: 'Freelancer & Contractor Management' },
  { id: 'ak4', task: 'Review pending design approvals from clients', timeSlot: 'morning', priority: 'high', duration: '20 min', responsible: 'Creative Director', sourceDoc: 'Design Review & Approval Workflow' },
  { id: 'ak5', task: 'Process new creative brief submissions', timeSlot: 'morning', priority: 'medium', duration: '30 min', responsible: 'Account Manager', sourceDoc: 'Creative Brief Intake Process' },
  { id: 'ak6', task: 'Update social media content queue for this week', timeSlot: 'morning', priority: 'medium', duration: '20 min', responsible: 'Content Manager', sourceDoc: 'Social Media Content Pipeline' },
  { id: 'ak7', task: 'Back up active project files to cloud storage', timeSlot: 'morning', priority: 'low', duration: '10 min', responsible: 'Studio Manager', sourceDoc: 'File Management & Digital Asset Organization' },
  { id: 'ak8', task: 'Conduct internal design review session', timeSlot: 'afternoon', priority: 'high', duration: '60 min', responsible: 'Creative Director', sourceDoc: 'Design Review & Approval Workflow' },
  { id: 'ak9', task: 'Send client revision updates with progress screenshots', timeSlot: 'afternoon', priority: 'high', duration: '30 min', responsible: 'Designer', sourceDoc: 'Client Feedback & Revision Management' },
  { id: 'ak10', task: 'Run pre-flight checks on files going to print', timeSlot: 'afternoon', priority: 'high', duration: '20 min', responsible: 'Production Manager', sourceDoc: 'Quality Assurance & Pre-Flight Checklist' },
  { id: 'ak11', task: 'Follow up on outstanding client invoices', timeSlot: 'afternoon', priority: 'medium', duration: '15 min', responsible: 'Finance', sourceDoc: 'Financial Management & Invoicing' },
  { id: 'ak12', task: 'Review and respond to new business inquiries', timeSlot: 'afternoon', priority: 'medium', duration: '20 min', responsible: 'Business Dev', sourceDoc: 'New Business & Lead Generation' },
  { id: 'ak13', task: 'Prepare quotations for pending project requests', timeSlot: 'afternoon', priority: 'medium', duration: '30 min', responsible: 'Account Manager', sourceDoc: 'Project Pricing & Quotation Process' },
  { id: 'ak14', task: 'Update project timelines and notify clients of delays', timeSlot: 'evening', priority: 'high', duration: '15 min', responsible: 'Project Manager', sourceDoc: 'Client Onboarding & Project Kickoff' },
  { id: 'ak15', task: 'Archive completed project files with proper naming', timeSlot: 'evening', priority: 'medium', duration: '20 min', responsible: 'Studio Manager', sourceDoc: 'File Management & Digital Asset Organization' },
  { id: 'ak16', task: 'Log billable hours and update time tracking', timeSlot: 'evening', priority: 'medium', duration: '10 min', responsible: 'All Staff', sourceDoc: 'Studio Daily Operations & Time Management' },
  { id: 'ak17', task: 'Prepare tomorrow\'s photography shoot equipment list', timeSlot: 'evening', priority: 'low', duration: '15 min', responsible: 'Photographer', sourceDoc: 'Photography Shoot Planning & Execution' },
  { id: 'ak18', task: 'Update portfolio with recently completed work', timeSlot: 'evening', priority: 'low', duration: '20 min', responsible: 'Marketing', sourceDoc: 'Portfolio & Case Study Development' },
];

export default function DailyChecklistPage() {
  const [, navigate] = useLocation();
  const [activePersona, setActivePersona] = useState<Persona>('riad-routes');
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [filterTime, setFilterTime] = useState<TimeOfDay | 'all'>('all');

  const checklist = activePersona === 'riad-routes' ? RR_CHECKLISTS : AK_CHECKLISTS;

  const filteredChecklist = useMemo(() => {
    if (filterTime === 'all') return checklist;
    return checklist.filter(item => item.timeSlot === filterTime);
  }, [checklist, filterTime]);

  const toggleItem = (id: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetChecklist = () => setCompletedItems(new Set());

  const completionRate = checklist.length > 0
    ? Math.round((Array.from(completedItems).filter(id => checklist.some(c => c.id === id)).length / checklist.length) * 100)
    : 0;

  const timeIcon = (slot: TimeOfDay) => {
    if (slot === 'morning') return <Sun className="w-3 h-3 text-amber-500" />;
    if (slot === 'afternoon') return <Coffee className="w-3 h-3 text-orange-500" />;
    return <Moon className="w-3 h-3 text-indigo-400" />;
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return 'text-red-400 bg-red-500/10';
    if (p === 'medium') return 'text-amber-400 bg-amber-500/10';
    return 'text-green-400 bg-green-500/10';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <CheckSquare className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold">Daily Operations Checklist</h1>
          <Badge variant="secondary" className="ml-auto">{completionRate}% complete</Badge>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Date & Persona Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              <span>{today}</span>
            </div>
            <h2 className="font-display text-2xl mt-1">
              {activePersona === 'riad-routes' ? 'Riad & Routes' : 'ArtKech Design Studio'}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setActivePersona('riad-routes'); setCompletedItems(new Set()); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${activePersona === 'riad-routes' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:border-accent/50'}`}
            >
              <Plane className="w-4 h-4" /> Riad & Routes
            </button>
            <button
              onClick={() => { setActivePersona('artkech'); setCompletedItems(new Set()); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${activePersona === 'artkech' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:border-accent/50'}`}
            >
              <Palette className="w-4 h-4" /> ArtKech Studio
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Array.from(completedItems).filter(id => checklist.some(c => c.id === id)).length} of {checklist.length} tasks completed</span>
            <button onClick={resetChecklist} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Time Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'morning', 'afternoon', 'evening'] as const).map(slot => (
            <button
              key={slot}
              onClick={() => setFilterTime(slot)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${filterTime === slot ? 'bg-accent/10 border-accent text-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
            >
              {slot === 'morning' && <Sun className="w-3 h-3" />}
              {slot === 'afternoon' && <Coffee className="w-3 h-3" />}
              {slot === 'evening' && <Moon className="w-3 h-3" />}
              {slot === 'all' && <Clock className="w-3 h-3" />}
              {slot.charAt(0).toUpperCase() + slot.slice(1)}
            </button>
          ))}
        </div>

        {/* Checklist Items */}
        <div className="space-y-2">
          {filteredChecklist.map(item => {
            const isCompleted = completedItems.has(item.id);
            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all ${isCompleted ? 'opacity-60 border-green-500/30' : 'hover:border-accent/50'}`}
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-green-500" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.task}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {timeIcon(item.timeSlot)} {item.timeSlot}
                      </span>
                      <Badge variant="outline" className={`text-xs ${priorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.duration}</span>
                      <span className="text-xs text-muted-foreground">• {item.responsible}</span>
                    </div>
                    {item.sourceDoc && (
                      <p className="text-xs text-accent/70 mt-1 truncate">Source: {item.sourceDoc}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
