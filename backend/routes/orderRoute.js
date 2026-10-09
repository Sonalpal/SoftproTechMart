const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const decrementStock = require("../utils/stockHelper");
const calculateTotal = require("../utils/pricing");
const generateOrderId = require("../utils/orderId");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// The logged-in user (from the token) must be the same person as the :id in
// the URL. Admins may also read any user's orders.
const isOwnerOrAdmin = (req) =>
  req.user.id === req.params.id || req.user.role === "admin";

const forbidden = (res) =>
  res.status(403).json({ msg: "You are not allowed to view these orders" });

// Order place from cart (cash on delivery only).
// Online orders are created in /api/payment/verify after Razorpay confirms payment.
router.post("/order/cart", verifyToken, async (req, res) => {
  // The user comes from the login token, never from the request body
  const userId = req.user.id;
  const { addressId } = req.body;

  try {
    const cartItems = (
      await Cart.find({ userId }).populate("productId")
    ).filter((item) => item.productId);

    if (!cartItems.length) {
      return res.status(400).json({
        msg: "Cart is empty",
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
        msg: "Please select a valid delivery address",
      });
    }

    const { total: totalAmount } = calculateTotal(cartItems);

    const oid = generateOrderId();

    const newOrder = new Order({
      userId,
      addressId: address._id,
      orderId: oid,
      totalAmount,
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    await newOrder.save();

    for (const item of cartItems) {
      const orderItem = new OrderItem({
        orderId: newOrder._id,
        productId: item.productId._id,
        quantity: String(item.quantity),
      });
      await orderItem.save();
      await decrementStock(item.productId._id, item.quantity);
    }

    await Cart.deleteMany({ userId });

    return res.json({
      msg: "Order placed successfully",
      orderId: oid,
    });
  } catch (err) {
    console.error("Order error:", err);

    return res.status(500).json({
      msg: "Failed to place order",
    });
  }
});

// Total revenue from successfully delivered orders (Admin only)
router.get("/revenue", verifyAdmin, async (req, res) => {
  try {
    const result = await Order.aggregate([
      { $match: { orderStatus: "delivered" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          deliveredOrders: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = result[0]?.totalRevenue || 0;
    const deliveredOrders = result[0]?.deliveredOrders || 0;

    res.json({
      msg: "Revenue calculated successfully",
      data: { totalRevenue, deliveredOrders },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to calculate revenue" });
  }
});

// Order history for a user (the user themselves, or an admin)
router.get("/order/history/:id", verifyToken, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req)) return forbidden(res);

    const orders = await Order.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ msg: "Order history fetched successfully", data: orders });
  } catch (err) {
    res.json({ msg: "Failed to fetch order history" });
  }
});

// All orders for admin
router.get("/orders", verifyAdmin, async (req, res) => {
  try {
    const order = await Order.find().populate("userId").lean();
    res.json({ msg: "All orders fetched successfully", data: order });
  } catch (err) {
    res.json({ msg: "Failed to fetch all orders" });
  }
});

// Update order status and payment status (Admin only)
router.patch("/status/:id", verifyAdmin, async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const updateFields = { orderStatus };
    if (paymentStatus) updateFields.paymentStatus = paymentStatus; // COD: set to completed on delivery
    const data = await Order.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
    });
    res.json({ msg: "Status updated", data });
  } catch (err) {
    res.json({ msg: "Failed to update status" });
  }
});

// Orders of a single user (the user themselves, or an admin)
router.get("/user/:id", verifyToken, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req)) return forbidden(res);

    const data = await Order.find({ userId: req.params.id }).lean();
    res.json({ msg: "Order history fetched successfully", data: data });
  } catch (err) {
    res.json({ msg: "Failed to fetch order history" });
  }
});

module.exports = router;