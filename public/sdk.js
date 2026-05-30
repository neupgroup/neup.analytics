(function () {
  try {
    var script = document.currentScript;
    if (!script) {
      // Fallback: find the last script with sdk.js in src
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && /\/sdk\.js(\?.*)?$/.test(scripts[i].src)) {
          script = scripts[i];
          break;
        }
      }
    }

    var siteId = script && (script.getAttribute('data-site-id') || script.dataset.siteId);
    var collectAttr = script && (script.getAttribute('data-collect') || script.dataset.collect || 'pageview');
    var collect = collectAttr ? collectAttr.split(',').map(function (s) { return s.trim(); }) : ['pageview'];

    if (!siteId) return;

    // Derive analytics origin from the script src so we send to the analytics app, not the host page
    var analyticsOrigin = (script && script.src) ? (new URL(script.src)).origin : window.location.origin;
    var endpoint = (new URL('/api/collect', analyticsOrigin)).toString() + '?siteId=' + encodeURIComponent(siteId);

    function send(payload) {
      try {
        var body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(endpoint, blob);
          return;
        }
      } catch (e) {
        // fallthrough
      }

      // fallback to fetch
      try {
        fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }

    function makeBasePayload() {
      return {
        siteId: siteId,
        pagePath: location.pathname + location.search + location.hash,
        content: '', // not capturing full DOM by default for privacy and size
        window: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent,
        events: [],
      };
    }

    // send initial pageview
    if (collect.indexOf('pageview') !== -1) {
      var payload = makeBasePayload();
      payload.events.push({ type: 'pageview', ts: Date.now() });
      send(payload);
    }

    // clicks
    if (collect.indexOf('clicks') !== -1) {
      document.addEventListener('click', function (e) {
        try {
          var t = e.target;
          var selector = '';
          if (t && t.id) selector = '#' + t.id;
          else if (t && t.className) selector = t.tagName.toLowerCase() + '.' + t.className.toString().split(' ').join('.');
          else if (t) selector = t.tagName && t.tagName.toLowerCase();

          var p = makeBasePayload();
          p.events.push({ type: 'click', ts: Date.now(), x: e.clientX, y: e.clientY, selector: selector });
          send(p);
        } catch (err) {}
      }, true);
    }

    // scroll
    if (collect.indexOf('scrolls') !== -1 || collect.indexOf('scroll') !== -1) {
      var last = 0;
      window.addEventListener('scroll', function () {
        var now = Date.now();
        if (now - last < 1000) return; // throttle
        last = now;
        try {
          var p = makeBasePayload();
          p.events.push({ type: 'scroll', ts: Date.now(), scrollY: window.scrollY, scrollX: window.scrollX });
          send(p);
        } catch (err) {}
      }, { passive: true });
    }

    // simple error capture
    if (collect.indexOf('errors') !== -1) {
      window.addEventListener('error', function (ev) {
        try {
          var p = makeBasePayload();
          p.events.push({ type: 'error', ts: Date.now(), message: ev.message, filename: ev.filename, lineno: ev.lineno, colno: ev.colno });
          send(p);
        } catch (err) {}
      });

      window.addEventListener('unhandledrejection', function (ev) {
        try {
          var p = makeBasePayload();
          p.events.push({ type: 'unhandledrejection', ts: Date.now(), reason: (ev && ev.reason && (ev.reason.message || String(ev.reason))) || String(ev) });
          send(p);
        } catch (err) {}
      });
    }

    // expose a minimal API
    window.neupAnalytics = window.neupAnalytics || {};
    window.neupAnalytics.siteId = siteId;
    window.neupAnalytics.collect = collect;
    window.neupAnalytics.pageview = function () { if (collect.indexOf('pageview') !== -1) { var p = makeBasePayload(); p.events.push({ type: 'pageview', ts: Date.now() }); send(p); } };
    window.neupAnalytics.track = function (event) { try { var p = makeBasePayload(); p.events.push(event); send(p); } catch (e) {} };
  } catch (e) {
    // Do not throw in host pages
    console.error('neup.sdk error', e);
  }
})();
