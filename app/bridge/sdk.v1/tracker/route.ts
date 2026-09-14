const sdkSource = String.raw`(function () {
  try {
    var SESSION_ID_KEY = 'session_id';
    var SESSION_STARTED_AT_KEY = 'session_started_at';
    var EVENT_BUFFER_KEY = 'session_event_buffer';
    var SNAPSHOT_CAPTURED_PREFIX = 'snapshot_web_captured_at:';
    var DURATION_SCHEDULE = [500, 1000, 2000, 4000, 8000, 12000, 16000, 20000, 25000, 30000, 35000, 40000];
    var FIRST_WINDOW_INTERVAL_MS = 500;
    var MAX_WINDOW_MS = 30000;
    var SCROLL_SAMPLE_INTERVAL_MS = 500;
    var nextFlushElapsedMs = FIRST_WINDOW_INTERVAL_MS;
    var flushTimerId = null;
    var lastScrollEventAt = 0;

    var script = document.currentScript;
    if (!script) {
      // Fallback: find the SDK route or a legacy sdk.js script.
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && /\/(?:bridge\/sdk\.v1\/tracker\/?|sdk\.js)(?:[?#].*)?$/.test(scripts[i].src)) {
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
    var contextId = script && (script.getAttribute('data-context-id') || script.dataset.contextId || '');
    var cookieKeys = [];
    var serverFields = {};
    try { cookieKeys = JSON.parse(script.getAttribute('data-cookie-keys') || '[]'); } catch (_) {}
    if (cookieKeys !== '*' && !Array.isArray(cookieKeys)) cookieKeys = [];
    try { serverFields = JSON.parse(script.getAttribute('data-server-fields') || '{}'); } catch (_) {}
    if (!serverFields || typeof serverFields !== 'object' || Array.isArray(serverFields)) serverFields = {};
    // Omit untouched example placeholders from events.
    Object.keys(serverFields).forEach(function (name) {
      if (serverFields[name] === '--valuegoeshere--') delete serverFields[name];
    });
    function trackedCookies() {
      var result = Object.create(null);
      if (cookieKeys !== '*' && cookieKeys.length === 0) return result;
      try {
        document.cookie.split(';').forEach(function (entry) {
          var separator = entry.indexOf('=');
          if (separator < 0) return;
          var name = entry.slice(0, separator).trim();
          if (cookieKeys !== '*' && cookieKeys.indexOf(name) === -1) return;
          var value = entry.slice(separator + 1);
          try { value = decodeURIComponent(value); } catch (_) {}
          result[name] = value;
        });
      } catch (_) {}
      return result;
    }
    var geoLocation = '';
    if (collect.indexOf('geolocation') !== -1 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        geoLocation = position.coords.latitude + ',' + position.coords.longitude;
      }, function () {}, { maximumAge: 300000, timeout: 3000 });
    }

    if (!siteId) return;
    var instances = window.__neupAnalyticsInstances = window.__neupAnalyticsInstances || Object.create(null);
    if (instances[siteId]) return;
    instances[siteId] = true;
    var transportState = window.__neupAnalyticsTransport = window.__neupAnalyticsTransport || { pendingBytes: 0 };
    var MAX_BATCH_BYTES = 48 * 1024;
    var MAX_BUFFER_BYTES = 256 * 1024;
    var MAX_BUFFER_EVENTS = 500;
    var batchEventLimit = 20;
    var retryCount = 0;
    var retryAt = 0;
    var deliveryTimerId = null;
    SESSION_ID_KEY += ':' + siteId;
    SESSION_STARTED_AT_KEY += ':' + siteId;
    EVENT_BUFFER_KEY += ':' + siteId;

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

    function byteSize(value) {
      return new Blob([JSON.stringify(value)]).size;
    }

    function persistBuffer() {
      while (eventBuffer.length > MAX_BUFFER_EVENTS || byteSize(eventBuffer) > MAX_BUFFER_BYTES) {
        eventBuffer.shift();
      }
      safeSessionStorageSet(EVENT_BUFFER_KEY, JSON.stringify(eventBuffer));
    }
    if (!Array.isArray(eventBuffer)) eventBuffer = [];
    eventBuffer = eventBuffer.filter(function (event) { return event && typeof event === 'object'; });
    persistBuffer();

    function getElapsedMs() {
      return Math.max(0, Date.now() - sessionStartedAt);
    }

    // Derive analytics origin from the script src so we send to the analytics app, not the host page
    var scriptUrl = (script && script.src) ? new URL(script.src) : null;
    var analyticsOrigin = scriptUrl ? scriptUrl.origin : window.location.origin;
    var defaultEndpointPath = scriptUrl
      ? scriptUrl.pathname.replace(/\/(?:bridge\/sdk\.v1\/tracker\/?|sdk\.js)$/, '/bridge/api.v1/activity')
      : '/bridge/api.v1/activity';
    var endpoint = endpointAttr
      ? (new URL(endpointAttr, analyticsOrigin)).toString()
      : (new URL(defaultEndpointPath, analyticsOrigin)).toString() + '?project=' + encodeURIComponent(siteId);
    var transportMode = modeAttr || 'activity';
    var pageUrl = window.location.href;
    var snapshotSentThisPage = false;
    var durationStartedAt = document.visibilityState === 'hidden' ? null : Date.now();
    var viewStartedAt = Date.now();
    var viewId = uuid();
    var viewDuration = 0;
    var durationStopped = false;
    var durationTick = 0;
    var sending = false;

    function send(payload, unloading) {
      var body = JSON.stringify(payload);
      var bytes = new Blob([body]).size;
      // Share the exit budget across tracker projects on this page. Use fetch so
      // the lock lasts until completion, rather than merely beacon acceptance.
      if (unloading && transportState.pendingBytes + bytes > MAX_BATCH_BYTES) {
        return Promise.resolve({ ok: false, status: 0 });
      }
      if (unloading) transportState.pendingBytes += bytes;
      function finish(result) {
        if (unloading) transportState.pendingBytes -= bytes;
        return result;
      }
      try {
        return fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: body,
          keepalive: !!unloading,
        }).then(function (response) {
          if (!response.ok) console.warn('neup.sdk: collection rejected', response.status);
          return finish({ ok: response.ok, status: response.status });
        }).catch(function () { return finish({ ok: false, status: 0 }); });
      } catch (e) { return Promise.resolve(finish({ ok: false, status: 0 })); }
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
        contextId: contextId || undefined,
        projectId: siteId,
        type: event.type || 'activity',
        timeSpent: typeof event.elapsedMs === 'number' ? Math.max(0, Math.round(event.elapsedMs)) : undefined,
        duration: event.type === 'duration' ? event.duration : undefined,
        pageUrl: event.pageUrl || pageUrl,
        url: event.pageUrl || pageUrl,
        path: event.pagePath || location.pathname,
        referral: document.referrer || undefined,
        referrer: document.referrer || undefined,
        geoLocation: geoLocation || undefined,
        userAgent: navigator.userAgent,
        moreDetails: {
          cookies: trackedCookies(),
          serverFields: serverFields,
          siteId: siteId,
          viewId: event.viewId,
          pagePath: event.pagePath || location.pathname + location.search + location.hash,
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

    function buildBatchPayload(includeHeartbeat, events) {
      var payload = makeBasePayload();
      payload.events = events.slice();

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

    function buildPayload(events, includeHeartbeat) {
      return transportMode === 'activity'
        ? events.map(buildActivityEvent)
        : buildBatchPayload(includeHeartbeat, events);
    }

    function scheduleDelivery(delay) {
      if (deliveryTimerId) window.clearTimeout(deliveryTimerId);
      deliveryTimerId = window.setTimeout(function () {
        deliveryTimerId = null;
        if (document.visibilityState !== 'hidden') flush(false);
      }, delay);
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

    function recordDuration() {
      var now = Date.now();
      if (durationStopped) return;
      if (collect.indexOf('pageview') !== -1 && durationStartedAt !== null && now > durationStartedAt) {
        viewDuration += now - durationStartedAt;
        enqueue({ type: 'duration', timestamp: now, duration: viewDuration });
      }
      durationStartedAt = document.visibilityState === 'hidden' ? null : now;
    }

    function flush(includeHeartbeat, unloading) {
      recordDuration();
      if (sending || Date.now() < retryAt) return;
      if (!unloading && document.visibilityState === 'hidden') return;
      var sentEvents = [];
      var payload;
      while (sentEvents.length < batchEventLimit && sentEvents.length < eventBuffer.length) {
        var candidate = sentEvents.concat([eventBuffer[sentEvents.length]]);
        var candidatePayload = buildPayload(candidate, includeHeartbeat !== false);
        if (byteSize(candidatePayload) > MAX_BATCH_BYTES) {
          if (sentEvents.length) break;
          // A single oversized event cannot be split without changing its meaning.
          eventBuffer.shift();
          persistBuffer();
          console.warn('neup.sdk: oversized event discarded');
          continue;
        }
        sentEvents = candidate;
        payload = candidatePayload;
      }
      if (!sentEvents.length) return;
      sending = true;
      send(payload, unloading).then(function (result) {
        var permanent = result.status >= 400 && result.status < 500
          && [408, 413, 429].indexOf(result.status) === -1;
        var discard = result.ok || permanent || (result.status === 413 && sentEvents.length === 1);
        if (discard) {
          eventBuffer = eventBuffer.filter(function (event) { return sentEvents.indexOf(event) === -1; });
          persistBuffer();
        }
        if (result.status === 413 && sentEvents.length > 1) {
          batchEventLimit = Math.max(1, Math.floor(sentEvents.length / 2));
        }
        retryCount = result.ok ? 0 : Math.min(retryCount + 1, 5);
        retryAt = result.ok ? 0 : Date.now() + Math.min(60000, 5000 * Math.pow(2, retryCount - 1));
        sending = false;
        if (eventBuffer.length && document.visibilityState !== 'hidden') {
          scheduleDelivery(result.ok ? 0 : retryAt - Date.now());
        }
      });
    }

    function enqueue(event) {
      event.viewId = viewId;
      event.pageUrl = pageUrl;
      event.pagePath = new URL(pageUrl).pathname + new URL(pageUrl).search + new URL(pageUrl).hash;
      // Copy caller data so later mutations cannot grow or corrupt the queue.
      try { event = JSON.parse(JSON.stringify(event)); } catch (_) { return; }
      if (byteSize(event) > MAX_BATCH_BYTES) {
        console.warn('neup.sdk: oversized event discarded');
        return;
      }
      eventBuffer.push(event);
      persistBuffer();
    }

    function scheduleNextFlush() {
      if (flushTimerId) {
        window.clearTimeout(flushTimerId);
      }

      if (durationStopped || collect.indexOf('pageview') === -1) return;
      var targetElapsed = durationTick < DURATION_SCHEDULE.length
        ? DURATION_SCHEDULE[durationTick]
        : 40000 + (durationTick - DURATION_SCHEDULE.length + 1) * 5000;
      var nextDelay = Math.max(0, viewStartedAt + targetElapsed - Date.now());
      flushTimerId = window.setTimeout(function () {
        flush(true);
        durationTick++;
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
        recordDuration();
        pageUrl = window.location.href;
        startView();
        enqueue({ type: 'pageview', timestamp: Date.now(), elapsedMs: 0 });
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

    function startView() {
      viewId = uuid();
      viewStartedAt = Date.now();
      viewDuration = 0;
      durationTick = 0;
      durationStopped = false;
      durationStartedAt = document.visibilityState === 'hidden' ? null : Date.now();
      scheduleNextFlush();
    }
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.nodeType === 3) target = target.parentElement;
      if (!target || !target.closest || !target.closest('a[href],area[href]')) return;
      flush(true, true);
      durationStopped = true;
      durationStartedAt = null;
      window.clearTimeout(flushTimerId);
    }, true);

    function onNavigation() {
      if (window.location.href === pageUrl) return;
      recordDuration();
      pageUrl = window.location.href;
      startView();
      if (collect.indexOf('pageview') !== -1) {
        enqueue({ type: 'pageview', timestamp: Date.now(), elapsedMs: 0 });
        flush(true);
      }
    }
    ['pushState', 'replaceState'].forEach(function (name) {
      var original = window.history[name];
      window.history[name] = function () {
        var result = original.apply(this, arguments);
        onNavigation();
        return result;
      };
    });
    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush(true, true);
      else {
        durationStartedAt = Date.now();
        if (eventBuffer.length) scheduleDelivery(Math.max(0, retryAt - Date.now()));
      }
    });

    window.addEventListener('pagehide', function () {
      flush(true, true);
      durationStartedAt = null;
    });
    window.addEventListener('pageshow', function () {
      durationStartedAt = document.visibilityState === 'hidden' ? null : Date.now();
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
