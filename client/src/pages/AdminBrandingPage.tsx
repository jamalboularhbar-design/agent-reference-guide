import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paintbrush, Save, Loader2 } from 'lucide-react';

const BRANDING_KEYS = [
  { key: 'site_title', label: 'Site Title', placeholder: 'Agent Reference Guide', type: 'text' },
  { key: 'tagline', label: 'Tagline', placeholder: 'Operational processes & best practices', type: 'text' },
  { key: 'accent_color', label: 'Accent Color', placeholder: '#e8783a', type: 'color' },
  { key: 'logo_url', label: 'Logo URL', placeholder: '/logo.svg', type: 'text' },
  { key: 'footer_text', label: 'Footer Text', placeholder: 'Riad & Routes — riadandroutes.com', type: 'text' },
  { key: 'words_per_minute', label: 'Reading Speed (words/min)', placeholder: '200', type: 'number' },
];

export default function AdminBrandingPage() {
  const { data: settings, isLoading } = trpc.branding.get.useQuery();
  const updateMutation = trpc.branding.update.useMutation();
  const utils = trpc.useUtils();

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: { settingKey: string; settingValue: string }) => {
        map[s.settingKey] = s.settingValue;
      });
      setValues(map);
    }
  }, [settings]);

  const handleSave = async (key: string) => {
    await updateMutation.mutateAsync({ key, value: values[key] || '' });
    utils.branding.get.invalidate();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Paintbrush className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Branding Settings</h1>
          {saved && <span className="text-sm text-green-500 ml-auto">Saved!</span>}
        </div>

        <div className="space-y-4">
          {BRANDING_KEYS.map(({ key, label, placeholder, type }) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {type === 'color' ? (
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="color"
                        value={values[key] || '#e8783a'}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                        className="w-10 h-10 rounded border border-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={values[key] || ''}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm"
                      />
                    </div>
                  ) : (
                    <input
                      type={type}
                      value={values[key] || ''}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm"
                    />
                  )}
                  <Button size="sm" onClick={() => handleSave(key)} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
