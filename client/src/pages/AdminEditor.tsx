import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, Search, FileText, ArrowLeft, Save, X, AlertTriangle, Loader2
} from 'lucide-react';
import { getLoginUrl } from '@/const';
import { toast } from 'sonner';

export default function AdminEditor() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingDoc, setEditingDoc] = useState<{ slug?: string; title: string; category: string; content: string } | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const { data: categoriesData } = trpc.documents.categories.useQuery();
  const { data: documentsData, refetch } = trpc.documents.list.useQuery({
    limit: 600,
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    search: search || undefined,
  });

  const createMutation = trpc.documents.create.useMutation({
    onSuccess: () => { refetch(); setEditingDoc(null); toast.success('Document created successfully'); },
    onError: (err) => { toast.error(`Failed to create: ${err.message}`); },
  });
  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => { refetch(); setEditingDoc(null); toast.success('Document updated successfully'); },
    onError: (err) => { toast.error(`Failed to update: ${err.message}`); },
  });
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteSlug(null); toast.success('Document deleted'); },
    onError: (err) => { toast.error(`Failed to delete: ${err.message}`); setDeleteSlug(null); },
  });

  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const documents = useMemo(() => documentsData?.documents ?? [], [documentsData]);

  // Use tRPC utils to fetch document content for editing
  const trpcUtils = trpc.useUtils();

  const handleEditClick = async (slug: string, title: string, category: string) => {
    setLoadingSlug(slug);
    try {
      const doc = await trpcUtils.documents.getBySlug.fetch({ slug });
      if (doc) {
        setEditingDoc({ slug, title: doc.title, category: doc.category, content: doc.content || '' });
      } else {
        toast.error('Document not found');
      }
    } catch (err: any) {
      toast.error(`Failed to load document: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingSlug(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Authentication Required</h2>
          <p className="text-muted-foreground">You need to sign in to access the admin editor.</p>
          <Button onClick={() => window.location.href = getLoginUrl()}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access the document editor.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!editingDoc) return;
    if (!editingDoc.title.trim() || !editingDoc.category.trim() || !editingDoc.content.trim()) {
      toast.error('Title, category, and content are all required');
      return;
    }
    if (editingDoc.slug) {
      updateMutation.mutate({ slug: editingDoc.slug, title: editingDoc.title, category: editingDoc.category, content: editingDoc.content });
    } else {
      createMutation.mutate({ title: editingDoc.title, category: editingDoc.category, content: editingDoc.content });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Document Editor</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Admin Panel — Create, edit, and manage documents</p>
            </div>
          </div>
          <Button onClick={() => setEditingDoc({ title: '', category: '', content: '' })} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="container py-4 sm:py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {documents.length} of {documentsData?.total ?? 0} documents
        </p>

        {/* Document List */}
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.slug} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/30 hover:border-accent/30 transition-colors group">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                  {doc.wordCount && <span className="text-[10px] text-muted-foreground">{Math.ceil(doc.wordCount / 200)} min read</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loadingSlug === doc.slug}
                  onClick={() => handleEditClick(doc.slug, doc.title, doc.category)}
                >
                  {loadingSlug === doc.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteSlug(doc.slug)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={open => !open && setEditingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc?.slug ? 'Edit Document' : 'Create New Document'}</DialogTitle>
            <DialogDescription>
              {editingDoc?.slug ? 'Modify the document content below.' : 'Fill in the details to create a new document.'}
            </DialogDescription>
          </DialogHeader>
          {editingDoc && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                  <Input
                    value={editingDoc.title}
                    onChange={e => setEditingDoc({ ...editingDoc, title: e.target.value })}
                    placeholder="Document title..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <Input
                    value={editingDoc.category}
                    onChange={e => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    placeholder="e.g., Engineering, Sales..."
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c.category} value={c.category} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Content (Markdown)
                  <span className="ml-2 text-muted-foreground/60">
                    {editingDoc.content.split(/\s+/).filter(Boolean).length} words
                  </span>
                </label>
                <Textarea
                  value={editingDoc.content}
                  onChange={e => setEditingDoc({ ...editingDoc, content: e.target.value })}
                  placeholder="Write your document content in Markdown..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)} disabled={isSaving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !editingDoc?.title || !editingDoc?.category || !editingDoc?.content}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSlug} onOpenChange={open => !open && setDeleteSlug(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSlug(null)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteSlug && deleteMutation.mutate({ slug: deleteSlug })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Deleting...</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
