const jwt = require("jsonwebtoken");
const redisClient =
  require("../config/redis");

const authMiddleware =
  async (req,res,next) => {
    console.log("AUTH HIT");

  try {

    const authHeader =
      req.headers.authorization;

      console.log(
  "Header:",
  authHeader
);

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const blacklisted =
      await redisClient.get(
        `blacklist:${token}`
      );

    if (blacklisted) {
      return res.status(401).json({
        message:
          "Token has been revoked",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
    console.log("NEXT CALLED");

  } catch (error) {
    console.log(error);

    return res.status(401).json({
      message: "Invalid token",
    });

  }
};

module.exports =
  authMiddleware;