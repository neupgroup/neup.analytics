import Link from 'next/link';
import Image from 'next/image';
import { makeAppPath } from '@/core/appconfig';

type NeupIdLogoProps = {
  iconHref: string;
  textHref: string;
};

export function NeupIdLogo({ iconHref, textHref }: NeupIdLogoProps) {
  // Pass the public base path explicitly because dynamic process.env lookups
  // are not inlined into the client bundle by Next.js.
  const logoSrc = makeAppPath(
    '/logo.svg',
    process.env.NEXT_PUBLIC_APP_BASEPATH || null,
  );

  return (
    <div className="flex items-center gap-2">
      <Link href={iconHref} className="flex items-center">
        <Image
          src={logoSrc}
          alt="Neup.Analytics logo"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg"
          priority
        />
      </Link>
      <Link href={textHref} className="flex items-center">
        <span className="font-headline text-lg font-semibold leading-none">
          Neup.Analytics
        </span>
      </Link>
    </div>
  );
}
