import { Router } from 'express';
import { YouTubeUrlSchema, VideoIdSchema } from '@yia/shared';
import { validateYouTubeUrl, fetchVideoMeta, fetchCaptions } from '../services/youtube';
import { createError } from '../utils/error-handler';

export const youtubeRouter = Router();

youtubeRouter.post('/validate', (req, res) => {
  const parsed = YouTubeUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 'invalid_request',
      message: parsed.error.flatten().fieldErrors.url?.[0] ?? 'Invalid URL'
    });
    return;
  }
  const result = validateYouTubeUrl(parsed.data.url);
  res.json(result);
});

youtubeRouter.get('/meta/:videoId', async (req, res, next) => {
  try {
    const parsed = VideoIdSchema.parse({ videoId: req.params.videoId });
    const meta = await fetchVideoMeta(parsed.videoId);
    res.json(meta);
  } catch (error) {
    next(createError({ status: 400, code: 'meta_fetch_failed', message: (error as Error).message }));
  }
});

youtubeRouter.get('/captions/:videoId', async (req, res, next) => {
  try {
    const parsed = VideoIdSchema.parse({ videoId: req.params.videoId });
    const captions = await fetchCaptions(parsed.videoId);
    res.json(captions);
  } catch (error) {
    next(
      createError({
        status: 501,
        code: 'captions_unavailable',
        message: (error as Error).message
      })
    );
  }
});
