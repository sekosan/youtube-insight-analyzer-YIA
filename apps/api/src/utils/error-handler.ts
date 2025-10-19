import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

export const createError = (error: Partial<ApiError>): ApiError => ({
  status: error.status ?? 500,
  code: error.code ?? 'internal_error',
  message: error.message ?? 'Unexpected error',
  details: error.details
});

export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if ((err as ApiError).status) {
    const apiError = err as ApiError;
    res.status(apiError.status).json({
      code: apiError.code,
      message: apiError.message,
      details: apiError.details
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'validation_error',
      message: 'Invalid request payload',
      details: err.flatten()
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    code: 'internal_error',
    message: 'Unexpected error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
