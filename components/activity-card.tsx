import { Link } from '#/components/ui/link';
import { cn } from '#/core/utils';

type ActivityCardProps = {
  title: string;
  titleHref?: string;
  pageLabel: string;
  pageHref?: string;
  agentLabel: string;
  agentHref?: string;
  locationLabel?: string | null;
  timestamp: string;
  detailHref?: string;
  metadata?: string | null;
  className?: string;
};

export function ActivityCard({
  title,
  titleHref,
  pageLabel,
  pageHref,
  agentLabel,
  agentHref,
  locationLabel,
  timestamp,
  detailHref,
  metadata,
  className,
}: ActivityCardProps) {
  const titleContent = titleHref ? (
    <Link
      href={titleHref}
      className="pointer-events-auto font-medium text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4"
    >
      {title}
    </Link>
  ) : (
    <span className="font-medium text-inherit">{title}</span>
  );

  const pageContent = pageHref ? (
    <Link
      href={pageHref}
      className="pointer-events-auto text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4"
    >
      {pageLabel}
    </Link>
  ) : (
    <span>{pageLabel}</span>
  );

  const agentContent = agentHref ? (
    <Link
      href={agentHref}
      className="pointer-events-auto text-inherit transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4"
    >
      {agentLabel}
    </Link>
  ) : (
    <span>{agentLabel}</span>
  );

  return (
    <div
      className={cn(
        'relative isolate block border border-slate-200 bg-white px-5 py-4 transition-colors duration-200 ease-out hover:bg-sky-50 focus-within:bg-sky-50',
        className
      )}
    >
      {detailHref ? (
        <Link
          href={detailHref}
          aria-label={`View activity details for ${title}`}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        />
      ) : null}

      <p className="pointer-events-none relative z-[1] break-all text-sm text-slate-950">
        {titleContent} on {pageContent} by {agentContent}
        {locationLabel ? <> from <span>{locationLabel}</span></> : null}
      </p>

      <p className="pointer-events-none relative z-[1] mt-1 text-sm text-slate-500">
        {timestamp}
      </p>

      {metadata ? (
        <p className="pointer-events-none relative z-[1] mt-1 text-xs text-slate-500">
          {metadata}
        </p>
      ) : null}
    </div>
  );
}
