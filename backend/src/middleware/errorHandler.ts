import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface AppError extends Error {
  status?: number;
  code?: string;
}

export const asyncHandler = <T>(
  fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<T>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Error:", err);

  const status = err.status || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
};
