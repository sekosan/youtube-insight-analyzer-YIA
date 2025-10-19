import { Router } from 'express';
import { youtubeRouter } from './youtube';
import { transcriptRouter } from './transcript';
import { analyzeRouter } from './analyze';

export const apiRouter = Router();

apiRouter.use('/youtube', youtubeRouter);
apiRouter.use('/transcript', transcriptRouter);
apiRouter.use('/analyze', analyzeRouter);
