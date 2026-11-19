const express = require('express');
const { attachUser } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const postsRouter = require('./routes/posts');
const categoriesRouter = require('./routes/categories');
const commentsRouter = require('./routes/comments');
const { metricsMiddleware, metricsHandler, tagRouteBase } = require('./metrics');

const app = express();

// First middleware, so the duration histogram times the whole request.
app.use(metricsMiddleware);
app.use(express.json());
app.use(attachUser);

// Prometheus scrape endpoint (Alloy reads it via the prometheus.io/* pod annotations).
app.get('/metrics', metricsHandler);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'content-service',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    release: 'demo-1',
  });
});

app.use('/posts', tagRouteBase('/posts'), postsRouter);
app.use('/categories', tagRouteBase('/categories'), categoriesRouter);
app.use('/comments', tagRouteBase('/comments'), commentsRouter);

// Unmatched routes.
app.use((req, res, next) => {
  next(ApiError.notFound('Route not found'));
});

app.use(errorHandler);

module.exports = app;
