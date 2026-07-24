import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export const adminMiddleware = (req: any, res: Response, next: NextFunction) => {
  authMiddleware(req, res, () => {
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: "Access denied. Admin only." });
    }
  });
};
