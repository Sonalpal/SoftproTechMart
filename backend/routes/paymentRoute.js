const Razorpay = require("razorpay");
const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const crypto = require("crypto");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Address = require("../models/Address");
const decrementStock = require("../utils/stockHelper");
const calculateTotal = require("../utils/pricing");
const generateOrderId = require("../utils/orderId");
const verifyToken = require("../middleware/verifyToken");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/create-order", verifyToken, async (req, res) => {
  try {
    // The user comes from the login token, never from the request body
    const userId = req.user.id;

    // Re-fetch cart from DB (skip items whose product was deleted)
    const cartItems = (
      await Cart.find({ userId }).populate("productId")
    ).filter((item) => item.productId);

    if (!cartItems.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const { total } = calculateTotal(cartItems);

    const order = await razorpay.orders.create({
      amount: total * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({
      success: true,
      order,
      amount: total,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/verify", verifyToken, async (req, res) => {
  try {
    // The user comes from the login token, never from the request body
    const userId = req.user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
    } = req.body;

    // Verify Signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        msg: "Invalid payment signature",
      });
    }

    // If this payment already created an order, don't create another one
    const existingOrder = await Order.findOne({
      transactionId: razorpay_payment_id,
    });
    if (existingOrder) {
      return res.json({
        success: true,
        msg: "Order already created for this payment",
      });
    }

    // The delivery address must belong to this user
    const address = await Address.findOne({
      _id: addressId,
      userId,
      status: { $in: ["active", "default"] },
    });
    if (!address) {
      return res.status(400).json({
        success: false,
        msg: "Please select a valid delivery address",
      });
    }

    // Get Cart Items (skip items whose product was deleted)
    const cartItems = (
      await Cart.find({ userId }).populate("productId")
    ).filter((item) => item.productId);

    if (!cartItems.length) {
      return res.status(400).json({ success: false, msg: "Cart is empty" });
    }

    // Generate Order Number
    const oid = generateOrderId();

    // Calculate Total Amount (same helper as create-order, includes shipping)
    const { total: totalAmount } = calculateTotal(cartItems);

    // Create Main Order
    const newOrder = new Order({
      userId,
      orderId: oid,
      totalAmount,
      addressId: address._id,
      paymentMethod: "online",
      paymentStatus: "completed",
      orderStatus: "pending",
      transactionId: razorpay_payment_id,
    });

    await newOrder.save();

    // Create Order Items
    for (const item of cartItems) {
      const orderItem = new OrderItem({
        orderId: newOrder._id,
        productId: item.productId._id,
        quantity: item.quantity,
      });
      await orderItem.save();
      await decrementStock(item.productId._id, item.quantity);
    }

    // Clear Cart
    await Cart.deleteMany({ userId });

    return res.json({
      success: true,
      msg: "Payment verified and order created successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
});

module.exports = router;