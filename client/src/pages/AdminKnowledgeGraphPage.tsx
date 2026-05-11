import { useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

const COLORS: Record<string, string> = {
  'Luxury Travel': '#e8a04e',
  'Creative Studio': '#4ea0e8',
  'Operations': '#4ee8a0',
  'Marketing': '#e84ea0',
  'Finance': '#a04ee8',
};

function getColor(group: string | null): string {
  if (!group) return '#888';
  return COLORS[group] || `hsl(${Math.abs(group.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 60%, 55%)`;
}

export default function AdminKnowledgeGraphPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === 'admin';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data, isLoading } = trpc.knowledgeGraph.data.useQuery(undefined, { enabled: isAdmin });

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width = canvas.parentElement?.clientWidth || 900;
    const H = canvas.height = 600;
    const { nodes, edges } = data;
    if (nodes.length === 0) return;

    // Simple force-directed layout
    const positions = nodes.map((_: any, i: number) => ({
      x: W / 2 + (Math.cos(i * 2.399) * Math.min(W, H) * 0.35),
      y: H / 2 + (Math.sin(i * 2.399) * Math.min(W, H) * 0.35),
      vx: 0, vy: 0,
    }));

    const nodeMap = new Map(nodes.map((n: any, i: number) => [n.id, i]));

    // Run simple simulation
    for (let iter = 0; iter < 100; iter++) {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 5000 / (dist * dist);
          positions[i].vx -= (dx / dist) * force;
          positions[i].vy -= (dy / dist) * force;
          positions[j].vx += (dx / dist) * force;
          positions[j].vy += (dy / dist) * force;
        }
      }
      // Attraction along edges
      for (const edge of edges) {
        const si = nodeMap.get(edge.source);
        const ti = nodeMap.get(edge.target);
        if (si === undefined || ti === undefined) continue;
        const dx = positions[ti].x - positions[si].x;
        const dy = positions[ti].y - positions[si].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - 120) * 0.01;
        positions[si].vx += (dx / dist) * force;
        positions[si].vy += (dy / dist) * force;
        positions[ti].vx -= (dx / dist) * force;
        positions[ti].vy -= (dy / dist) * force;
      }
      // Center gravity
      for (let i = 0; i < nodes.length; i++) {
        positions[i].vx += (W / 2 - positions[i].x) * 0.001;
        positions[i].vy += (H / 2 - positions[i].y) * 0.001;
        positions[i].x += positions[i].vx * 0.5;
        positions[i].y += positions[i].vy * 0.5;
        positions[i].vx *= 0.9;
        positions[i].vy *= 0.9;
        positions[i].x = Math.max(40, Math.min(W - 40, positions[i].x));
        positions[i].y = Math.max(40, Math.min(H - 40, positions[i].y));
      }
    }

    // Draw
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, W, H);

    // Edges
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (const edge of edges) {
      const si = nodeMap.get(edge.source);
      const ti = nodeMap.get(edge.target);
      if (si === undefined || ti === undefined) continue;
      ctx.beginPath();
      ctx.moveTo(positions[si].x, positions[si].y);
      ctx.lineTo(positions[ti].x, positions[ti].y);
      ctx.stroke();
    }

    // Nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = positions[i];
      const color = getColor(node.group);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      const label = (node.label || '').length > 20 ? (node.label || '').slice(0, 18) + '…' : (node.label || '');
      ctx.fillText(label, pos.x, pos.y + 16);
    }

    // Legend
    const categories = Array.from(new Set(nodes.map((n: any) => n.group).filter(Boolean)));
    let ly = 20;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    for (const cat of categories) {
      ctx.fillStyle = getColor(cat as string);
      ctx.beginPath();
      ctx.arc(20, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(cat as string, 32, ly + 4);
      ly += 18;
    }
  }, [data]);

  if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Admin access required</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Share2 className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold text-foreground">Knowledge Graph</h1>
        </div>
      </header>
      <div className="container py-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        ) : data && data.nodes.length > 0 ? (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <canvas ref={canvasRef} className="w-full" style={{ height: 600 }} />
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No documents or cross-references found. Add documents and cross-references to visualize the knowledge graph.</p>
          </div>
        )}
        {data && (
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <span>{data.nodes.length} documents</span>
            <span>{data.edges.length} connections</span>
          </div>
        )}
      </div>
    </div>
  );
}
