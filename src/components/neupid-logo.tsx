import Link from 'next/link';
import { Bot } from 'lucide-react';

type NeupIdLogoProps = {
  iconHref: string;
  textHref: string;
};

export function NeupIdLogo({ iconHref, textHref }: NeupIdLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Link href={iconHref}>
        <Bot className="h-6 w-6 text-primary" />
      </Link>
      <Link href={textHref}>
        <span className="font-headline text-lg font-bold">Neup.Analytics</span>
      </Link>
    </div>
  );
}
