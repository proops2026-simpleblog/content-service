const express = require('express');
const { attachUser } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const postsRouter = require('./routes/posts');
const categoriesRouter = require('./routes/categories');
const commentsRouter = require('./routes/comments');

const app = express();

app.use(express.json());
app.use(attachUser);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'content-service' });
});

app.use('/posts', postsRouter);
app.use('/categories', categoriesRouter);
app.use('/comments', commentsRouter);

// Unmatched routes.
app.use((req, res, next) => {
  next(ApiError.notFound('Route not found'));
});

app.use(errorHandler);

module.exports = app;
