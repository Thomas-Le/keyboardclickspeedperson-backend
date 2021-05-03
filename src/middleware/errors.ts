import { Request, Response, NextFunction } from "express";

export const catchAsync = fn =>
    (...args: [Request, Response, NextFunction]) => fn(...args).catch(args[2]);

export const notFoundError = (_req: Request, res: Response, _next: NextFunction) => res.status(404).json({ message: 'Not Found' });

export const internalServerError = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!err.status) {
        console.log(err.stack);
    }
    res.status(err.status || 500).json({ message: err.message ||  "Internal Server Error" });
};