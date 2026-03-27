import { Router, Request, Response } from 'express';
import { mockPortfolio } from '../data/mock-portfolio';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.json({ ...mockPortfolio, lastUpdated: new Date() });
});

router.get('/holdings', (_req: Request, res: Response): void => {
  res.json(mockPortfolio.holdings);
});

export default router;
