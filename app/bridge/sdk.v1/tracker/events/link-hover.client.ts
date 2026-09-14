export const linkHoverSource = String.raw`
if (collects('linkhover', 'linkhovers')) {
  var lastLinkHoverAt = new WeakMap();
  document.addEventListener('mouseover', function (event) {
    var link = interactionLink(event.target);
    if (!link || privateTarget(link) || (event.relatedTarget && link.contains(event.relatedTarget))) return;
    var now = Date.now();
    if (lastLinkHoverAt.has(link) && now - lastLinkHoverAt.get(link) < 1000) return;
    lastLinkHoverAt.set(link, now);
    emitInteraction('linkhover', link, { targetUrl: interactionUrl(link.href) });
  }, { passive: true });
}
`;
