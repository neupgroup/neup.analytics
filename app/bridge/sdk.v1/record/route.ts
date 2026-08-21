const sdkSource = String.raw`(function () {
  try {
    var SESSION_ID_KEY = 'session_id';
    var SESSION_STARTED_AT_KEY = 'session_started_at';
    var EVENT_BUFFER_KEY = 'session_event_buffer';
    var SNAPSHOT_CAPTURED_PREFIX = 'snapshot_web_captured_at:';
    var FIRST_WINDOW_INTERVAL_MS = 5000;
    var MAX_WINDOW_MS = 30000;
    var SCROLL_SAMPLE_INTERVAL_MS = 500;
    var nextFlushElapsedMs = FIRST_WINDOW_INTERVAL_MS;
    var flushTimerId = null;
    var lastScrollEventAt = 0;

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

    var siteId = script && (
      script.getAttribute('data-site-id') ||
      script.getAttribute('data-project-id') ||
      script.dataset.siteId ||
      script.dataset.projectId
    );
    var collectAttr = script && (script.getAttribute('data-collect') || script.dataset.collect || 'pageview');
    var collect = collectAttr ? collectAttr.split(',').map(function (s) { return s.trim(); }) : ['pageview'];
    var endpointAttr = script && (script.getAttribute('data-endpoint') || script.dataset.endpoint || '');
    var modeAttr = script && (script.getAttribute('data-mode') || script.dataset.mode || '');

    if (!siteId) return;

    function uuid() {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }

      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    function safeSessionStorageGet(key) {
      try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function safeSessionStorageSet(key, value) {
      try { window.sessionStorage.setItem(key, value); } catch (e) {}
    }

    function safeSessionStorageRemove(key) {
      try { window.sessionStorage.removeItem(key); } catch (e) {}
    }

    function safeLocalStorageGet(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }

    function safeLocalStorageSet(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) {}
    }

    var sessionId = safeSessionStorageGet(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = uuid();
      safeSessionStorageSet(SESSION_ID_KEY, sessionId);
    }

    var sessionStartedAt = Number(safeSessionStorageGet(SESSION_STARTED_AT_KEY) || Date.now());
    if (!safeSessionStorageGet(SESSION_STARTED_AT_KEY)) {
      safeSessionStorageSet(SESSION_STARTED_AT_KEY, String(sessionStartedAt));
    }

    var eventBuffer = [];
    try {
      eventBuffer = JSON.parse(safeSessionStorageGet(EVENT_BUFFER_KEY) || '[]') || [];
    } catch (e) {
      eventBuffer = [];
    }

    function persistBuffer() {
      safeSessionStorageSet(EVENT_BUFFER_KEY, JSON.stringify(eventBuffer));
    }

    function getElapsedMs() {
      return Math.max(0, Date.now() - sessionStartedAt);
    }

    // Derive analytics origin from the script src so we send to the analytics app, not the host page
    var scriptUrl = (script && script.src) ? new URL(script.src) : null;
    var analyticsOrigin = scriptUrl ? scriptUrl.origin : window.location.origin;
    var defaultEndpointPath = scriptUrl
      ? scriptUrl.pathname.replace(/\/bridge\/sdk\.v1\/record\/?$/, '/bridge/webhook.v1/activity')
      : '/bridge/webhook.v1/activity';
    var endpoint = endpointAttr
      ? (new URL(endpointAttr, analyticsOrigin)).toString()
      : (new URL(defaultEndpointPath, analyticsOrigin)).toString() + '?project=' + encodeURIComponent(siteId);
    var transportMode = modeAttr || 'activity';
    var pageUrl = window.location.href;
    var snapshotSentThisPage = false;

    function send(payload) {
      try {
        var body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: 'application/json' });
          if (navigator.sendBeacon(endpoint, blob)) {
            return;
          }
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

    function normalizeTrackedUrl(value) {
      try {
        return new URL(String(value || ''), window.location.href).toString();
      } catch (e) {
        return String(value || '');
      }
    }

    function isAnalyticsRequestUrl(value) {
      return normalizeTrackedUrl(value) === normalizeTrackedUrl(endpoint);
    }

    function buildActivityEvent(event) {
      return {
        identifierId: sessionId,
        type: event.type || 'activity',
        timeSpent: typeof event.elapsedMs === 'number' ? Math.max(0, Math.round(event.elapsedMs)) : undefined,
        pageUrl: pageUrl,
        referral: document.referrer || undefined,
        userAgent: navigator.userAgent,
        moreDetails: {
          siteId: siteId,
          pagePath: location.pathname + location.search + location.hash,
          x: event.x,
          y: event.y,
          scrollX: event.scrollX,
          scrollY: event.scrollY,
          element: event.element,
          key: event.key,
          value: event.value,
          targetUrl: event.targetUrl,
          method: event.method,
          status: event.status,
          timestamp: event.timestamp,
        },
      };
    }

    function getSnapshotStorageKey() {
      return SNAPSHOT_CAPTURED_PREFIX + siteId + ':' + pageUrl.split('#')[0];
    }

    function shouldCaptureSnapshot() {
      var lastCapturedAt = Number(safeLocalStorageGet(getSnapshotStorageKey()) || 0);
      var oneHourMs = 60 * 60 * 1000;
      return !lastCapturedAt || Date.now() - lastCapturedAt >= oneHourMs;
    }

    function captureSnapshotData() {
      try {
        var clone = document.documentElement.cloneNode(true);
        var head = clone.querySelector('head');
        if (head && !head.querySelector('base')) {
          var base = document.createElement('base');
          base.setAttribute('href', window.location.href);
          head.insertBefore(base, head.firstChild);
        }
        return '<!doctype html>\n' + clone.outerHTML;
      } catch (e) {
        return '';
      }
    }

    function makeBasePayload() {
      return {
        siteId: siteId,
        sessionId: sessionId,
        pagePath: location.pathname + location.search + location.hash,
        pageUrl: pageUrl,
        content: '',
        window: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent,
        events: [],
      };
    }

    function buildBatchPayload(includeHeartbeat) {
      var payload = makeBasePayload();
      payload.events = eventBuffer.slice();

      if (includeHeartbeat) {
        var elapsedMs = getElapsedMs();
        payload.events.push({
          type: 'heartbeat',
          timestamp: Date.now(),
          elapsedMs: elapsedMs,
          value: String(Math.min(elapsedMs, MAX_WINDOW_MS)),
        });
      }

      return payload;
    }

    function buildActivityBatch(includeHeartbeat) {
      var events = eventBuffer.slice();

      if (includeHeartbeat) {
        var elapsedMs = getElapsedMs();
        events.push({
          type: 'heartbeat',
          timestamp: Date.now(),
          elapsedMs: elapsedMs,
          value: String(Math.min(elapsedMs, MAX_WINDOW_MS)),
        });
      }

      return events.map(buildActivityEvent);
    }

    function sendHourlySnapshot() {
      if (snapshotSentThisPage || !shouldCaptureSnapshot()) return;

      var data = captureSnapshotData();
      if (!data) return;

      snapshotSentThisPage = true;
      safeLocalStorageSet(getSnapshotStorageKey(), String(Date.now()));

      var payload = makeBasePayload();
      payload.snapshot = {
        pageUrl: pageUrl,
        data: data,
        details: {
          title: document.title || '',
          siteId: siteId,
          pagePath: location.pathname + location.search + location.hash,
          capturedAt: new Date().toISOString(),
          viewport: { width: window.innerWidth, height: window.innerHeight },
        },
      };
      payload.content = data;

      send(payload);
    }

    function flush(includeHeartbeat) {
      var payload = transportMode === 'activity'
        ? buildActivityBatch(includeHeartbeat !== false)
        : buildBatchPayload(includeHeartbeat !== false);

      if (transportMode === 'activity' && !payload.length) return;
      if (transportMode !== 'activity' && !payload.events.length) return;

      send(payload);
      eventBuffer = [];
      persistBuffer();
    }

    function enqueue(event) {
      eventBuffer.push(event);
      persistBuffer();
    }

    function scheduleNextFlush() {
      if (flushTimerId) {
        window.clearTimeout(flushTimerId);
      }

      var elapsed = getElapsedMs();
      var targetElapsed = nextFlushElapsedMs;
      if (elapsed >= MAX_WINDOW_MS) {
        targetElapsed = elapsed + MAX_WINDOW_MS;
      }

      var nextDelay = Math.max(0, targetElapsed - elapsed);
      flushTimerId = window.setTimeout(function () {
        flush(true);
        if (nextFlushElapsedMs < MAX_WINDOW_MS) {
          nextFlushElapsedMs += FIRST_WINDOW_INTERVAL_MS;
        } else {
          nextFlushElapsedMs = getElapsedMs() + MAX_WINDOW_MS;
        }
        scheduleNextFlush();
      }, nextDelay);
    }

    // Send the first session packet immediately so the session exists on arrival.
    if (collect.indexOf('pageview') !== -1) {
      enqueue({ type: 'pageview', timestamp: Date.now(), elapsedMs: 0 });
    }
    flush(true);

    scheduleNextFlush();

    if (transportMode !== 'activity') {
      if (document.readyState === 'complete') {
        window.setTimeout(sendHourlySnapshot, 0);
      } else {
        window.addEventListener('load', function () {
          window.setTimeout(sendHourlySnapshot, 0);
        }, { once: true });
      }
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

          enqueue({ type: 'click', timestamp: Date.now(), x: e.clientX, y: e.clientY, element: selector, elapsedMs: getElapsedMs() });
        } catch (err) {}
      }, true);
    }

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

    if (collect.indexOf('requests') !== -1) {
      if (window.fetch) {
        var originalFetch = window.fetch;
        window.fetch = function () {
          var args = Array.prototype.slice.call(arguments);
          var requestUrl = args[0] && args[0].url ? args[0].url : String(args[0] || '');
          var requestInit = args[1] || {};
          var method = requestInit.method || (args[0] && args[0].method) || 'GET';

          if (isAnalyticsRequestUrl(requestUrl)) {
            return originalFetch.apply(this, args);
          }

          return originalFetch.apply(this, args).then(function (response) {
            enqueue({
              type: 'request',
              timestamp: Date.now(),
              elapsedMs: getElapsedMs(),
              method: String(method).toUpperCase(),
              status: response && typeof response.status === 'number' ? response.status : undefined,
              targetUrl: requestUrl,
            });
            return response;
          }).catch(function (error) {
            enqueue({
              type: 'request',
              timestamp: Date.now(),
              elapsedMs: getElapsedMs(),
              method: String(method).toUpperCase(),
              status: 'error',
              targetUrl: requestUrl,
              value: error && error.message ? error.message : String(error),
            });
            throw error;
          });
        };
      }

      if (window.XMLHttpRequest) {
        var originalOpen = window.XMLHttpRequest.prototype.open;
        var originalSend = window.XMLHttpRequest.prototype.send;

        window.XMLHttpRequest.prototype.open = function (method, url) {
          this.__neupMethod = method;
          this.__neupUrl = url;
          return originalOpen.apply(this, arguments);
        };

        window.XMLHttpRequest.prototype.send = function () {
          var xhr = this;
          if (isAnalyticsRequestUrl(xhr.__neupUrl)) {
            return originalSend.apply(this, arguments);
          }

          function record() {
            enqueue({
              type: 'request',
              timestamp: Date.now(),
              elapsedMs: getElapsedMs(),
              method: xhr.__neupMethod ? String(xhr.__neupMethod).toUpperCase() : 'GET',
              status: typeof xhr.status === 'number' ? xhr.status : undefined,
              targetUrl: xhr.__neupUrl ? String(xhr.__neupUrl) : '',
            });
          }

          xhr.addEventListener('loadend', record, { once: true });
          return originalSend.apply(this, arguments);
        };
      }
    }

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

    // expose a minimal API
    window.neupAnalytics = window.neupAnalytics || {};
    window.neupAnalytics.siteId = siteId;
    window.neupAnalytics.collect = collect;
    window.neupAnalytics.sessionId = sessionId;
    window.neupAnalytics.endpoint = endpoint;
    window.neupAnalytics.mode = transportMode;
    window.neupAnalytics.pageview = function () {
      if (collect.indexOf('pageview') !== -1) {
        enqueue({ type: 'pageview', timestamp: Date.now(), elapsedMs: getElapsedMs() });
        flush(true);
      }
    };
    window.neupAnalytics.track = function (event) {
      try {
        enqueue(Object.assign({ timestamp: Date.now(), elapsedMs: getElapsedMs() }, event));
      } catch (e) {}
    };
    window.neupAnalytics.flush = function () {
      flush(true);
    };

    window.addEventListener('pagehide', function () {
      flush(true);
    });

    window.addEventListener('beforeunload', function () {
      flush(true);
    });
  } catch (e) {
    // Do not throw in host pages
    console.error('neup.sdk error', e);
  }
})();
`;

export async function GET() {
  return new Response(sdkSource, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
