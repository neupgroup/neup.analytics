export const scrollSource = String.raw`
    // scroll
    if (collect.indexOf('scrolls') !== -1 || collect.indexOf('scroll') !== -1) {
      window.addEventListener('scroll', function () {
        try {
          var now = Date.now();
          if (now - lastScrollEventAt < SCROLL_SAMPLE_INTERVAL_MS) return;
          lastScrollEventAt = now;
          enqueue({ type: 'scroll', timestamp: now, scrollY: window.scrollY, scrollX: window.scrollX, elapsedMs: getElapsedMs() });
        } catch (err) {}
      }, { passive: true });
    }


`;
