export const mouseClicksSource = String.raw`
if (collects('clicks', 'click')) {
  document.addEventListener('click', function (event) {
    if (!privateTarget(event.target)) emitInteraction('click', event.target, { x: event.clientX, y: event.clientY });
  }, true);
}
`;
