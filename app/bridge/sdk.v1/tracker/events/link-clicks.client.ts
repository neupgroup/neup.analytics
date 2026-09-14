export const linkClicksSource = String.raw`
if (collects('linkclicks', 'linkclick')) {
  document.addEventListener('click', function (event) {
    var link = interactionLink(event.target);
    if (link && !privateTarget(link)) emitInteraction('linkclick', link, { targetUrl: interactionUrl(link.href), x: event.clientX, y: event.clientY });
  }, true);
}
`;
