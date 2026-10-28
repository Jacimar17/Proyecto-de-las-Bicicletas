import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, message: "JWT_SECRET is not configured" });
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token not provided" });
    return;
  }

  try {
    const decoded = jwt.verify(authorization.slice(7), secret);
    if (typeof decoded === "string") {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }
    const payload = decoded as JwtPayload;
    if (typeof payload.id !== "string") {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }
    req.authUser = {
      id: payload.id,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ success: false, message: "Token not provided" });
      return;
    }
    if (!req.authUser.role || !roles.includes(req.authUser.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied: required role ${roles.join(" or ")}`,
      });
      return;
    }
    next();
  };
}

export const requireAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.authUser) {
    res.status(401).json({ success: false, message: "Token not provided" });
    return;
  }
  if (req.authUser.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Access denied: administrator role required",
    });
    return;
  }
  next();
};
