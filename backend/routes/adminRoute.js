const express = require("express");
const Admin = require("../models/Admin");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

router.post("/register", async (req, res) => {
  try {
    const { email, mobile, name, password } = req.body;

    if (!email || !mobile || !name || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please provide all required fields" });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({
          success: false,
          msg: "Admin already registered with this email",
        });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await Admin.create({
      name,
      email,
      mobile,
      password: hash,
    });

    return res
      .status(201)
      .json({ success: true, msg: "Admin Registered Successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, msg: "Registration failed", error: err.message });
  }
});

// admin auth routes

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please provide email and password" });
    }

    const a = await Admin.findOne({ email }).select("password");

    if (!a) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, a.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Credentials" });
    }

    const token = jwt.sign({ id: a._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.json({
      success: true,
      msg: "Login Successfully",
      id: a._id,
      token: token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Login failed" });
  }
});

module.exports = router;
