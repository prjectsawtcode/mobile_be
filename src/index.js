require('dotenv').config();
const app = require('./app');

module.exports = app;

if (require.main === module) {
  const db = require('./db/init');
  const PORT = process.env.PORT || 3000;
  console.log({env:process.env.NODE_ENV});
  
  (async () => {
    try {
      await db.init();
      await db.seed();
      app.listen(PORT, () => console.log(`SawtDeen API running on port ${PORT}`));
    } catch (err) {
      console.error('Failed to start:', err);
      process.exit(1);
    }
  })();
}
