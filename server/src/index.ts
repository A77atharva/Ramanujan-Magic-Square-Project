import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import cardRouter from './routes/card.js';
import employeesRouter from './routes/employees.js';
import organizationsRouter from './routes/organizations.js';
import emailRouter from './routes/email.js';
import { startScheduler } from './scheduler.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8080);

const allowedOrigin = process.env.CLIENT_ORIGIN ?? '*';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));

initDb();
console.log('Database initialized (SQLite).');

app.get('/api/healthz', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', cardRouter);
app.use('/api', employeesRouter);
app.use('/api', organizationsRouter);
app.use('/api', emailRouter);

startScheduler();

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
