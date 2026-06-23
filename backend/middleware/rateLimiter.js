const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  // 1 hour in milliseconds
  windowMs: 60 * 60 * 1000, 
  
  // Limit each IP to 15 requests per `window` (here, per hour)
  max: 15,

  message: {
    message: "Too many login attempts. Please try again after an hour.",
  },

  // Return standard rate limit info headers (X-RateLimit-Limit, X-RateLimit-Remaining)
  standardHeaders: true, 
  
  // Disable the logging of legacy headers (X-RateLimit-Limit, etc.)
  legacyHeaders: false, 
  
  // Optional: Only count failed login attempts (highly recommended for login routes)
  // skipSuccessfulRequests: true, 
});

module.exports = authLimiter;