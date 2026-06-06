require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db/init');

const app = express();

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/users', require('./modules/user/user.routes'));
app.use('/api/v1/announcements', require('./modules/announcement/announcement.routes'));
app.use('/api/v1/scholars', require('./modules/scholar/scholar.routes'));
app.use('/api/v1/chat', require('./modules/chat/chat.routes'));
app.use('/api/v1/fatwa', require('./modules/fatwa/fatwa.routes'));
app.use('/api/v1/prayer', require('./modules/prayer/prayer.routes'));
app.use('/api/v1/quran', require('./modules/quran/quran.routes'));
app.use('/api/v1/community', require('./modules/community/community.routes'));
app.use('/api/v1/subscriptions', require('./modules/subscription/subscription.routes'));
app.use('/api/v1/notifications', require('./modules/notification/notification.routes'));
app.use('/api/v1/uploads', require('./modules/upload/upload.routes'));
app.use('/api/v1/payments', require('./modules/payment/payment.routes'));
app.use('/api/v1/tour-packages', require('./modules/tour_package/tour_package.routes'));
app.use('/api/v1/shopping', require('./modules/shopping/shopping.routes'));
app.use('/api/v1/food-order', require('./modules/food_order/food_order.routes'));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await db.init();
    await db.seed();
    app.listen(PORT, () => console.log(`SawtDeen API running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
