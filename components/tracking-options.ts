export type TrackingOptions = {
  essentials: boolean;
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
