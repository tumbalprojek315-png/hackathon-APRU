// LIVE / OFFLINE indicator for the server that serves this app.
// (From Oracle; framework-agnostic, no dependencies.)
//
// The page itself can load from a cache (service worker, bfcache) even when
// the server is stopped, so the app checks the server directly, on two
// channels a cache can't answer (a no-store HEAD request that the service
// worker is told to skip, and a WebSocket, which never passes through one):
//   • Ping: every 2 s a HEAD request to `__health`, never cached. Any HTTP
//     answer = LIVE; a network error or no answer within 1.5 s = OFFLINE.
//   • Watch: an always-open WebSocket to `__ws`. When the server stops, the
//     OS drops it at once: we show OFFLINE right away, then confirm with a
//     ping. (On Windows a request to a stopped server hangs until its
//     timeout, so without the watch OFFLINE would lag by ~1.5 s.)
//     Servers without the watch endpoint (static hosts, serverless) are
//     detected automatically and get ping-only.
// The light blinks once per finished check — each blink is a real result,
// never a timer running on its own.
//
// Usage:
//   <div id="serverStatus" class="server-status" data-state="checking" role="status" aria-live="polite"></div>
//   import { startServerStatus } from './server-status.js';
//   startServerStatus(document.getElementById('serverStatus'));
//
// Listen for changes anywhere: window.addEventListener('serverstatus', (e) => e.detail.state)

const DEFAULTS = {
  healthPath: '__health', // relative to the page, so sub-path deployments work
  wsPath: '__ws',
  interval: 2000,
  timeout: 1500,
  labels: { live: 'LIVE', offline: 'OFFLINE', checking: 'CHECKING' },
  titles: {
    live: (ms, time) => `Server is running · answered in ${ms} ms · checked ${time}`,
    offline: (reason, time) => `Server is not responding${reason ? ` (${reason})` : ''} · checked ${time}`,
  },
};

export function startServerStatus(el, options = {}) {
  const opts = { ...DEFAULTS, ...options, labels: { ...DEFAULTS.labels, ...options.labels }, titles: { ...DEFAULTS.titles, ...options.titles } };

  // Build the dot + label if the element is empty.
  if (!el.querySelector('.ss-dot')) {
    el.textContent = '';
    const d = document.createElement('span');
    d.className = 'ss-dot';
    d.setAttribute('aria-hidden', 'true');
    const l = document.createElement('span');
    l.className = 'ss-label';
    el.append(d, l);
  }
  const dot = el.querySelector('.ss-dot');
  const label = el.querySelector('.ss-label');

  let state = 'checking';
  let inFlight = null;
  let timer = null;
  let socket = null;
  let stopped = false;
  let watchOpened = false; // the server has accepted the watch at least once
  let watchUnsupported = false; // e.g. a static host: ping only
  let lastWatchFailure = 0;

  function render(ms, at, reason) {
    el.dataset.state = state;
    const text = opts.labels[state];
    if (label.textContent !== text) label.textContent = text;
    const time = at.toLocaleTimeString('en-GB');
    el.title = state === 'live' ? opts.titles.live(ms, time) : state === 'offline' ? opts.titles.offline(reason, time) : '';
    el.setAttribute('aria-label', state === 'live' ? 'Server live' : state === 'offline' ? 'Server offline' : 'Checking server');
  }

  function blink() {
    dot.classList.remove('blink');
    void dot.offsetWidth; // restart the animation
    dot.classList.add('blink');
  }

  function report(via) {
    window.dispatchEvent(new CustomEvent('serverstatus', { detail: { state, at: Date.now(), via } }));
  }

  function schedule() {
    clearTimeout(timer);
    if (!stopped && document.visibilityState === 'visible') timer = setTimeout(check, opts.interval);
  }

  // One check. Calls made while one is running share its result.
  function check() {
    if (stopped) return Promise.resolve(state);
    if (inFlight) return inFlight;
    clearTimeout(timer);
    const started = performance.now();
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), opts.timeout);
    inFlight = fetch(new URL(`${opts.healthPath}?t=${Date.now()}`, location.href), { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      .then(() => ({ live: true }))
      .catch((err) => ({ live: false, reason: err.name === 'AbortError' ? 'no answer' : 'unreachable' }))
      .then(({ live, reason }) => {
        clearTimeout(abort);
        inFlight = null;
        if (stopped) return state;
        state = live ? 'live' : 'offline';
        render(Math.round(performance.now() - started), new Date(), reason);
        blink();
        report('ping');
        if (live) {
          // The watch failed but the server answers: this server has no
          // watch endpoint (static host). Otherwise (re)connect it.
          if (!watchOpened && lastWatchFailure && Date.now() - lastWatchFailure < 3000) watchUnsupported = true;
          if (!socket && !watchUnsupported) watch();
        }
        schedule();
        return state;
      });
    return inFlight;
  }

  function watch() {
    if (typeof WebSocket === 'undefined' || !opts.wsPath) {
      watchUnsupported = true;
      return;
    }
    const url = new URL(opts.wsPath, location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    let opened = false;
    try {
      socket = new WebSocket(url);
    } catch {
      socket = null;
      watchUnsupported = true;
      return;
    }
    socket.onopen = () => {
      opened = true;
      watchOpened = true;
    };
    socket.onclose = () => {
      socket = null;
      lastWatchFailure = Date.now();
      if (stopped) return;
      if (opened && state === 'live') {
        // The server dropped a connection that was open: it stopped.
        state = 'offline';
        render(0, new Date(), 'connection lost');
        blink();
        report('watch');
      }
      check(); // confirm (flips back to LIVE at once if the server answers)
    };
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') check();
    else clearTimeout(timer);
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', check);
  window.addEventListener('offline', check);

  render(0, new Date());
  check();

  return {
    check,
    getState: () => state,
    // For SPA frameworks: call on unmount.
    stop() {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    },
  };
}
