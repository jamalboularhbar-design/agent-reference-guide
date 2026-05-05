import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface AISummaryProps {
  slug: string;
  existingSummary?: string | null;
}

export default function AISummary({ slug, existingSummary }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(existingSummary || null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = trpc.documents.generateSummary.useMutation({
    onSuccess: (data) => {
      setSummary(data.summary);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate({ slug });
  };

  if (summary) {
    return (
      <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">AI Summary</span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors text-xs font-medium disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generating summary...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate AI Summary</span>
        </>
      )}
    </button>
  );
}
