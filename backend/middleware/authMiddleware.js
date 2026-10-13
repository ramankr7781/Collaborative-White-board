const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    try {
      const blacklisted = await redisClient.get(`blacklist:${token}`);
      if (blacklisted) {
        return res.status(401).json({
          message: "Token has been revoked",
        });
      }
    } catch (redisError) {
      console.warn("[Auth] Blacklist check failed:", redisError.message);
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("[Auth] Middleware error:", error);
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

module.exports = authMiddleware;