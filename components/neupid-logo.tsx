import { Link } from '@neup/components/ui/link';
import Image from 'next/image';
import { makeAppPath } from '@neup/core/appconfig';
import { getLogo, getName } from '@neup/core/identity';

type NeupIdLogoProps = {
  iconHref: string;
  textHref: string;
};

export function NeupIdLogo({ iconHref, textHref }: NeupIdLogoProps) {
  const logoSrc = makeAppPath(
    getLogo(),
  );

  return (
    <div className="flex items-center gap-2">
      <Link href={iconHref} className="flex items-center">
        <Image
          src={logoSrc}
          alt={`${getName()} logo`}
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg"
          priority
        />
      </Link>
      <Link href={textHref} className="flex items-center">
        <span className="font-headline text-lg font-semibold leading-none">
          {getName()}
        </span>
      </Link>
    </div>
  );
}
