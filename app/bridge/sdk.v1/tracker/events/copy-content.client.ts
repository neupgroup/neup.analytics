export const copyContentSource = String.raw`
if (collects('copy-content', 'copy')) {
  document.addEventListener('copy', function (event) {
    if (privateTarget(event.target) || privateTarget(document.activeElement)) return;
    var selection = window.getSelection ? window.getSelection() : null;
    if (selection && (privateTarget(selection.anchorNode) || privateTarget(selection.focusNode))) return;
    // Record the copy action without reading or changing clipboard contents.
    emitInteraction('copy-content', event.target, { action: 'copy' });
  }, true);
}
`;
