type ActivityPresentation = {
  type: string;
  typeLabel: string;
  agentType: string;
  agentTypeLabel: string;
};

function toReadableLabel(value: string): string {
  if (!value) return value;

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPathname(value: string): string {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

export function inferActivityType(pageUrl?: string | null): string {
  if (!pageUrl) {
    return 'activity';
  }

  const pathname = getPathname(pageUrl);

  if (pathname.includes('/order') || pathname.includes('/checkout')) {
    return 'order';
  }

  return 'visit';
}

export function inferAgentType(userAgent?: string | null): string {
  const normalized = userAgent?.toLowerCase().trim() ?? '';

  if (!normalized) {
    return 'unknown';
  }

  if (normalized.includes('postman')) {
    return 'postman';
  }

  if (
    normalized.includes('bot') ||
    normalized.includes('spider') ||
    normalized.includes('crawler') ||
    normalized.includes('slurp')
  ) {
    return 'bot';
  }

  if (
    normalized.includes('curl') ||
    normalized.includes('insomnia') ||
    normalized.includes('httpie') ||
    normalized.includes('axios') ||
    normalized.includes('node-fetch')
  ) {
    return 'api';
  }

  if (
    normalized.includes('mozilla') ||
    normalized.includes('chrome') ||
    normalized.includes('safari') ||
    normalized.includes('firefox') ||
    normalized.includes('edg')
  ) {
    return 'human';
  }

  return 'unknown';
}

export function presentActivity(activity: {
  type?: string | null;
  agent?: unknown;
  pageUrl?: string | null;
  userAgent?: string | null;
}): ActivityPresentation {
  const explicitType = activity.type?.trim().toLowerCase();
  const agentValue =
    typeof activity.agent === 'string'
      ? activity.agent
      : null;
  const type = explicitType || inferActivityType(activity.pageUrl);
  const agentType = agentValue?.trim().toLowerCase() || inferAgentType(activity.userAgent);
  const typeLabel = type === 'visit' ? 'Page visit' : toReadableLabel(type);

  return {
    type,
    typeLabel,
    agentType: toReadableLabel(agentType),
    agentTypeLabel: toReadableLabel(agentType),
  };
}
