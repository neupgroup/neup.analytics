export const trackingEventTypes = [
  { id: 'pageview', label: 'Page views and duration', description: 'Page visits and time spent on each page.' },
  { id: 'clicks', label: 'Mouse clicks', description: 'Clicks on buttons and other elements.' },
  { id: 'mousemove', label: 'Mouse movements', description: 'Pointer movement across the page.' },
  { id: 'keyboard', label: 'Keyboard strokes', description: 'Keyboard interactions.' },
  { id: 'forms', label: 'Form fields', description: 'Changes to form inputs.' },
  { id: 'linkhover', label: 'Link hovers', description: 'Links visitors hover over.' },
  { id: 'linkclicks', label: 'Link clicks', description: 'Links visitors follow.' },
  { id: 'selection', label: 'Content selection', description: 'Text visitors select.' },
  { id: 'copy-content', label: 'Copied content', description: 'Content visitors copy.' },
  { id: 'scroll', label: 'Scrolling', description: 'Scroll position and movement.' },
  { id: 'requests', label: 'Browser requests', description: 'Fetch and XMLHttpRequest activity.' },
  { id: 'errors', label: 'Browser errors', description: 'JavaScript errors and unhandled rejections.' },
  { id: 'geolocation', label: 'Geolocation', description: 'Location when the visitor grants permission.' },
] as const;

export type TrackingEventType = typeof trackingEventTypes[number]['id'];

export type TrackingOptions = {
  essentials: boolean;
  eventTypes?: TrackingEventType[];
  allCookies: boolean;
  cookies: string[];
  allServerCookies: boolean;
  serverCookies: string[];
  serverFields: string[];
};

export const defaultTrackingOptions: TrackingOptions = {
  essentials: true, allCookies: false, cookies: [], allServerCookies: false, serverCookies: [], serverFields: [],
};

export function trackingFields(options: TrackingOptions): Record<string, string> {
  return Object.fromEntries(options.serverFields.map((name) => [name, '--valuegoeshere--']));
}

export function trackingCollect(options: TrackingOptions): string {
  const selected = options.eventTypes ?? (options.essentials ? ['pageview'] : []);
  return trackingEventTypes.filter(({ id }) => selected.includes(id)).map(({ id }) => id).join(',') || 'none';
}
