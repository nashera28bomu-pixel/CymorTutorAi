require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const apiLimiter = require('./src/middleware/rateLimit');

const authRoutes = require('./src/routes/auth');
const tutorRoutes = require('./src/routes/tutor');
const documentRoutes = require('./src/routes/documents');
const quizRoutes = require('./src/routes/quizzes');
const flashcardRoutes = require('./src/routes/flashcards');
const curriculumRoutes = require('./src/routes/curriculum');
const progressRoutes = require('./src/routes/progress');

const app = express();

connectDB();

// Render (and most PaaS hosts) sit behind a reverse proxy, so Express needs
// to trust the X-Forwarded-For header to correctly identify client IPs -
// this is what express-rate-limit needs to work accurately.
app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', product: 'Cymor Tutor AI', developer: 'Legendary Smiley Cymor' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/progress', progressRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Cymor Tutor AI backend running on port ${PORT}`);
});
