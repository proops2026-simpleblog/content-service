require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`content-service listening on port ${PORT}`);
  });
}

module.exports = app;
