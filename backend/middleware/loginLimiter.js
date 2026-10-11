const { rateLimit } = require("express-rate-limit");

const createLoginLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Maximum 10 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      msg: "Too many login attempts. Please try again after 15 minutes.",
    },
  });

const userLoginLimiter = createLoginLimiter();
const adminLoginLimiter = createLoginLimiter();

module.exports = {
  userLoginLimiter,
  adminLoginLimiter,
};