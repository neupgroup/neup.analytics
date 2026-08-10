import Link from 'next/link';
import { Bot } from 'lucide-react';

type NeupIdLogoProps = {
  iconHref: string;
  textHref: string;
};

export function NeupIdLogo({ iconHref, textHref }: NeupIdLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Link href={iconHref} className="flex items-center">
        <Bot className="h-6 w-6 text-primary" />
      </Link>
      <Link href={textHref} className="flex items-center">
        <span className="font-headline text-lg font-semibold leading-none">
          Neup.Analytics
        </span>
      </Link>
    </div>
  );
}
