export const errorsSource = String.raw`
    // simple error capture
    if (collect.indexOf('errors') !== -1) {
      window.addEventListener('error', function (ev) {
        try {
          enqueue({ type: 'input', timestamp: Date.now(), element: 'window', value: 'error: ' + ev.message, elapsedMs: getElapsedMs() });
        } catch (err) {}
      });

      window.addEventListener('unhandledrejection', function (ev) {
        try {
          enqueue({ type: 'input', timestamp: Date.now(), element: 'window', value: 'unhandledrejection: ' + ((ev && ev.reason && (ev.reason.message || String(ev.reason))) || String(ev)), elapsedMs: getElapsedMs() });
        } catch (err) {}
      });
    }


`;
