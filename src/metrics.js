const client = require('prom-client');

// Dedicated registry (not the global default) so the app and tests share it explicitly.
const register = new client.Registry();

// Node.js process metrics for free: CPU, resident memory, event-loop lag, GC.
client.collectDefaultMetrics({ register });

// RED — Rate + Errors: one counter; errors are the status=~"5.." slice of it.
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// RED — Duration: a histogram so Grafana can compute p95 with histogram_quantile().
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Records which router a request entered ('/posts', ...). Express restores
// req.baseUrl when an error propagates out of a router, so it can't be read later.
function tagRouteBase(base) {
  return (req, res, next) => {
    res.locals.routeBase = base;
    next();
  };
}

// The route TEMPLATE ('/posts/:id'), never the concrete URL ('/posts/8f3a...'):
// one label value per id would create unbounded time series (cardinality explosion).
function routeLabel(req, res) {
  if (!req.route) return 'unmatched';
  const base = res.locals.routeBase || '';
  const path = req.route.path === '/' && base ? '' : req.route.path;
  return `${base}${path}`;
}

function metricsMiddleware(req, res, next) {
  // Scrapes of /metrics are not user traffic; counting them would skew Rate.
  if (req.path === '/metrics') return next();

  const endTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req, res),
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });
  return next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { register, metricsMiddleware, metricsHandler, tagRouteBase };
