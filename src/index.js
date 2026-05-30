require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Routes
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Modules
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

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
