import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardList, Plus, Trash2, Clock, AlertTriangle, CheckCircle, User, Plane, Palette } from 'lucide-react';

type Persona = 'riad-routes' | 'artkech';
type Priority = 'urgent' | 'normal' | 'info';

interface HandoverItem {
  id: string;
  content: string;
  priority: Priority;
  category: string;
}

interface HandoverNote {
  id: string;
  shift: string;
  author: string;
  timestamp: string;
  items: HandoverItem[];
  persona: Persona;
}

const RR_CATEGORIES = ['Guest Issues', 'Maintenance', 'Arrivals/Departures', 'VIP Notes', 'Supplier Updates', 'Security', 'F&B', 'General'];
const AK_CATEGORIES = ['Client Deadlines', 'Design Reviews', 'Print Jobs', 'Freelancer Updates', 'Client Feedback', 'Equipment', 'Billing', 'General'];

export default function ShiftHandoverPage() {
  const [, navigate] = useLocation();
  const [activePersona, setActivePersona] = useState<Persona>('riad-routes');
  const [currentShift, setCurrentShift] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('normal');
  const [newCategory, setNewCategory] = useState('General');
  const [savedNotes, setSavedNotes] = useState<HandoverNote[]>([]);

  const categories = activePersona === 'riad-routes' ? RR_CATEGORIES : AK_CATEGORIES;

  const addItem = () => {
    if (!newContent.trim()) return;
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      content: newContent.trim(),
      priority: newPriority,
      category: newCategory
    }]);
    setNewContent('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const saveHandover = () => {
    if (!items.length || !currentShift || !authorName) return;
    const note: HandoverNote = {
      id: Date.now().toString(),
      shift: currentShift,
      author: authorName,
      timestamp: new Date().toLocaleString(),
      items: [...items],
      persona: activePersona
    };
    setSavedNotes(prev => [note, ...prev]);
    setItems([]);
    setCurrentShift('');
  };

  const priorityIcon = (p: Priority) => {
    if (p === 'urgent') return <AlertTriangle className="w-3 h-3 text-red-400" />;
    if (p === 'normal') return <Clock className="w-3 h-3 text-amber-400" />;
    return <CheckCircle className="w-3 h-3 text-blue-400" />;
  };

  const priorityStyle = (p: Priority) => {
    if (p === 'urgent') return 'border-l-red-500 bg-red-500/5';
    if (p === 'normal') return 'border-l-amber-500 bg-amber-500/5';
    return 'border-l-blue-500 bg-blue-500/5';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ClipboardList className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold">Shift Handover Notes</h1>
        </div>
      </header>

      <main className="container py-8 space-y-8">
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

        {/* Create Handover */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" />
              Create Handover Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="e.g., Ahmed K."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Shift Ending</label>
                <select
                  value={currentShift}
                  onChange={e => setCurrentShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                >
                  <option value="">Select shift...</option>
                  <option value="Morning (6:00-14:00)">Morning (6:00-14:00)</option>
                  <option value="Afternoon (14:00-22:00)">Afternoon (14:00-22:00)</option>
                  <option value="Night (22:00-6:00)">Night (22:00-6:00)</option>
                  {activePersona === 'artkech' && <option value="Studio Hours (9:00-18:00)">Studio Hours (9:00-18:00)</option>}
                </select>
              </div>
            </div>

            {/* Add Item Form */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Describe the handover item..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as Priority)}
                  className="px-2 py-1.5 rounded border border-border bg-card text-sm"
                >
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="info">Info</option>
                </select>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="px-2 py-1.5 rounded border border-border bg-card text-sm"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={addItem}
                  disabled={!newContent.trim()}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-50"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Current Items */}
            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{items.length} items to hand over:</p>
                {items.map(item => (
                  <div key={item.id} className={`flex items-start gap-2 p-2 rounded-lg border-l-4 ${priorityStyle(item.priority)}`}>
                    {priorityIcon(item.priority)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{item.content}</p>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={saveHandover}
              disabled={!items.length || !currentShift || !authorName}
              className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground font-medium disabled:opacity-50 transition-opacity"
            >
              Save & Submit Handover
            </button>
          </CardContent>
        </Card>

        {/* Saved Handover Notes */}
        {savedNotes.filter(n => n.persona === activePersona).length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Recent Handover Notes</h3>
            {savedNotes.filter(n => n.persona === activePersona).map(note => (
              <Card key={note.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {note.author} — {note.shift}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {note.items.map(item => (
                    <div key={item.id} className={`flex items-start gap-2 p-2 rounded border-l-4 ${priorityStyle(item.priority)}`}>
                      {priorityIcon(item.priority)}
                      <div className="flex-1">
                        <p className="text-sm">{item.content}</p>
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
