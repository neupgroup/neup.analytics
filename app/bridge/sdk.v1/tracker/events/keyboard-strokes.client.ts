export const keyboardStrokesSource = String.raw`
if (collects('keyboard', 'keystrokes')) {
  document.addEventListener('keydown', function (event) {
    if (privateTarget(event.target) || event.repeat) return;
    var safeKeys = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
    emitInteraction('keydown', event.target, { key: safeKeys.indexOf(event.key) !== -1 ? event.key : '[redacted]' });
  }, true);
}
`;
