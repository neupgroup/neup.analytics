export const mouseMovementsSource = String.raw`
if (collects('mousemove', 'mousemovements')) {
  var lastMouseMovementAt = -Infinity;
  document.addEventListener('mousemove', function (event) {
    var now = Date.now();
    if (now - lastMouseMovementAt < 250 || privateTarget(event.target)) return;
    lastMouseMovementAt = now;
    emitInteraction('mousemove', event.target, { x: event.clientX, y: event.clientY });
  }, { passive: true });
}
`;
