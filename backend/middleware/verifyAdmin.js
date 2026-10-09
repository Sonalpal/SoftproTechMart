const verifyToken = require("./verifyToken");

// Passes only if the request has a valid token AND that token belongs to an admin
module.exports = (req, res, next) =>
  verifyToken(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, msg: "Admin access only" });
    }
    next();
  });
