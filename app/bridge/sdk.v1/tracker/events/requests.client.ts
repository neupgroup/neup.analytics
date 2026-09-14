export const requestsSource = String.raw`
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


`;
