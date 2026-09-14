export const contentSelectionSource = String.raw`
if (collects('selection', 'selections')) {
  var lastSelectionAt = -Infinity;
  document.addEventListener('selectionchange', function () {
    var now = Date.now();
    if (now - lastSelectionAt < 500 || !window.getSelection) return;
    var selection = window.getSelection();
    if (!selection || selection.isCollapsed || privateTarget(selection.anchorNode) || privateTarget(selection.focusNode)) return;
    if (privateTarget(document.activeElement)) return;
    lastSelectionAt = now;
    // Do not transmit selected text: it may contain personal information.
    emitInteraction('selection', selection.anchorNode, { action: 'select' });
  });
}
`;
