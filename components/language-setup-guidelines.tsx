'use client';

import { useEffect, useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { buildLanguageExamples } from '@/components/analytics-language-examples';

export function LanguageSetupGuidelines({ projectId }: { projectId: string }) {
  const [language, setLanguage] = useState('');
  const [copied, setCopied] = useState<number>();
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => {
      setLanguage(window.localStorage.getItem('neup-config-framework') ?? '');
      setCopied(undefined);
      setError('');
    };
    update();
    window.addEventListener('neup-config-framework-change', update);
    return () => window.removeEventListener('neup-config-framework-change', update);
  }, []);
  if (language === 'nextjs') return null;
  if (!language) return <p className="text-sm text-muted-foreground">Choose a language or framework above to see its setup scripts.</p>;
  const examples = buildLanguageExamples(language, projectId);
  return <div className="space-y-6">
    <p className="text-sm text-muted-foreground">Install the project secret in your server environment. The browser receives only a signed context token. Add the browser example to a JavaScript module or a module script in your page.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {examples.map((example, index) => <section key={example.title} className="space-y-2">
      <h3 className="text-base font-semibold">{example.title}</h3>
      <p className="text-sm text-muted-foreground">{example.description}</p>
      <div className="relative">
      <button type="button" aria-label={copied === index ? 'Code copied' : 'Copy code'} title={copied === index ? 'Copied' : 'Copy code'} className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={async () => {
        try {
          await navigator.clipboard.writeText(example.code);
          setCopied(index);
          setError('');
        } catch { setError('Clipboard unavailable. Select and copy the code below.'); }
      }}>{copied === index ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}</button>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-4 pr-16 font-mono text-xs leading-6 text-muted-foreground">{example.code}</pre>
      </div>
    </section>)}
  </div>;
}
