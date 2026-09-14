export const pageViewsSource = String.raw`
function trackPageview() {
  if (collects('pageview')) enqueue({ type: 'pageview', timestamp: Date.now(), elapsedMs: 0 });
}
`;
