import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ArrowLeft, Calendar, FileText, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function AdminContentCalendarPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

  const { data: events } = trpc.contentCalendar.events.useQuery(
    { startDate, endDate },
    { enabled: isAdmin }
  );

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    if (!events) return new Map<number, typeof events>();
    const map = new Map<number, typeof events>();
    for (const event of events) {
      if (!event.date) continue;
      const day = new Date(event.date).getDate();
      const existing = map.get(day) || [];
      existing.push(event);
      map.set(day, existing);
    }
    return map;
  }, [events]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container h-14 flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Calendar className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold text-foreground">Content Calendar</h1>
        </div>
      </header>

      <div className="container py-6 max-w-4xl">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-card/50 text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-foreground">{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-card/50 text-muted-foreground">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/50">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-card/50 p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {/* Day cells */}
          {days.map((day, idx) => {
            const dayEvents = day ? eventsByDay.get(day) || [] : [];
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            return (
              <div
                key={idx}
                className={`bg-background min-h-[80px] p-1.5 ${!day ? 'bg-card/20' : ''} ${isToday ? 'ring-1 ring-accent/50' : ''}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-muted-foreground'}`}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <button
                          key={i}
                          onClick={() => ev.slug && navigate(`/docs/${ev.slug}`)}
                          className={`w-full text-left px-1 py-0.5 rounded text-[9px] truncate ${
                            ev.type === 'created' ? 'bg-green-500/10 text-green-400' :
                            ev.type === 'scheduled' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-orange-500/10 text-orange-400'
                          }`}
                          title={ev.title || ''}
                        >
                          {ev.type === 'created' && <FileText className="w-2.5 h-2.5 inline mr-0.5" />}
                          {ev.type === 'scheduled' && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                          {ev.type === 'review_due' && <AlertCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                          {ev.title?.slice(0, 15)}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Created</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Scheduled</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Review Due</span>
        </div>
      </div>
    </div>
  );
}
