'use client';

import { useState } from 'react';
import { Atom, Braces, Boxes, Code2, Component, FileCode2, Layers3, Terminal, Triangle } from 'lucide-react';

const frameworks = [
  ['javascript', 'JavaScript', Braces],
  ['typescript', 'TypeScript', FileCode2],
  ['react', 'React', Atom],
  ['nextjs', 'Next.js', Triangle],
  ['vue', 'Vue', Layers3],
  ['angular', 'Angular', Component],
  ['python', 'Python', Terminal],
  ['php', 'PHP', Code2],
  ['other', 'Other', Boxes],
] as const;

export function FrameworkSelector() {
  const [framework, setFramework] = useState('');

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {frameworks.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setFramework(value)}
          className={`rounded-xl border bg-background p-4 text-left text-sm font-medium transition-colors hover:border-primary/60 hover:bg-primary/5 ${framework === value ? 'border-2 border-primary bg-primary/5 text-primary' : 'border-border/60'}`}
          aria-pressed={framework === value}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
