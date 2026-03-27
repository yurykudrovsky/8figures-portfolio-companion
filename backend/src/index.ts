import express, { Request, Response } from 'express';
import cors from 'cors';
import portfolioRoutes from './routes/portfolio';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  process.stdout.write(`8Figures API running on http://localhost:${PORT}\n`);
});

export default app;
