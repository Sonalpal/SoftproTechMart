   const crypto = require("crypto");

   const generateOrderId = () => `ORD${Date.now()}${crypto.randomInt(100, 1000)}`;

   module.exports = generateOrderId;