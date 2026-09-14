export const formFieldsSource = String.raw`
if (collects('forms', 'inputs')) {
  var lastFieldEvents = new WeakMap();
  function recordField(event) {
    var target = event.target;
    if (privateTarget(target) || !target || !target.matches || !target.matches('input,textarea,select,[contenteditable]')) return;
    var now = Date.now();
    if (event.type === 'input' && lastFieldEvents.has(target) && now - lastFieldEvents.get(target) < 500) return;
    lastFieldEvents.set(target, now);
    // Record interaction, never field values or selected option text.
    emitInteraction('input', target, { action: event.type });
  }
  document.addEventListener('input', recordField, true);
  document.addEventListener('change', recordField, true);
}
`;
