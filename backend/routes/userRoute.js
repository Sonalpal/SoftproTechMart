const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const EmailVerification = require("../models/EmailVerification");
const rateLimit = require("express-rate-limit");

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, msg: "Too many code requests. Please try again in 15 minutes." },
});
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, msg: "Too many verification attempts. Please try again in 15 minutes." },
});
const normalizeEmail = (email) => email.toLowerCase().trim();
const otpDigest = (email, otp) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${email}:${otp}`)
    .digest("hex");

const createMailTransport = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email delivery is not configured on the server");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
};

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

// Send a short-lived verification code before registration.
router.post("/send-otp", sendOtpLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, msg: "Please provide a valid email" });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, msg: "An account with this email already exists" });
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await EmailVerification.findOneAndUpdate(
      { email },
      { email, otpHash: otpDigest(email, otp), attempts: 0, expiresAt, verifiedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    try {
      await createMailTransport().sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Softpro Innovation verification code",
        text: `Your verification code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Your Softpro Innovation verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${otp}</p><p>It expires in 10 minutes.</p>`,
      });
    } catch (mailError) {
      await EmailVerification.deleteOne({ email });
      throw mailError;
    }

    return res.status(200).json({ success: true, msg: "Verification code sent. Check your email." });
  } catch (error) {
    console.error("Send verification email error:", error.message);
    return res.status(500).json({ success: false, msg: "Could not send the verification email. Check the server email settings and try again." });
  }
});

// Verify code, allowing at most five guesses for each issued code.
router.post("/verify-otp", verifyOtpLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
    if (!validateEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, msg: "Enter a valid email and 6-digit code" });
    }

    const record = await EmailVerification.findOne({ email, expiresAt: { $gt: new Date() } });
    if (!record) {
      return res.status(400).json({ success: false, msg: "The code has expired or was not requested. Send a new code." });
    }
    if (record.verifiedAt) {
      return res.status(200).json({ success: true, msg: "Email verified. You can create your account." });
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await EmailVerification.deleteOne({ _id: record._id });
      return res.status(429).json({ success: false, msg: "Too many incorrect attempts. Request a new code." });
    }

    const submittedHash = Buffer.from(otpDigest(email, otp), "hex");
    const savedHash = Buffer.from(record.otpHash, "hex");
    if (submittedHash.length !== savedHash.length || !crypto.timingSafeEqual(submittedHash, savedHash)) {
      record.attempts += 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) await record.deleteOne();
      else await record.save();
      return res.status(400).json({ success: false, msg: "Incorrect verification code" });
    }

    record.verifiedAt = new Date();
    await record.save();
    return res.status(200).json({ success: true, msg: "Email verified. You can create your account." });
  } catch (error) {
    console.error("Verify email code error:", error.message);
    return res.status(500).json({ success: false, msg: "Could not verify the code. Please try again." });
  }
});

// user registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Input validation
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        msg: "Please provide all required fields",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a valid email",
      });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a valid mobile number",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedMobile = mobile.trim();
    const isExist = await User.findOne({
      $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
    });

    if (isExist) {
      return res.status(400).json({
        success: false,
        msg: "User with this email or mobile already exists",
      });
    }

    const verifiedEmail = await EmailVerification.findOne({
      email: normalizedEmail,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });
    if (!verifiedEmail) {
      return res.status(403).json({ success: false, msg: "Verify your email before creating an account" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      password: hash,
    });

    await user.save();
    await EmailVerification.deleteOne({ _id: verifiedEmail._id });

    return res.status(201).json({
      success: true,
      msg: "User Registered Successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to register user",
      error: error.message,
    });
  }
});

// user login
router.post("/login", async (req, res) => {
  try {
    console.log("entered user login");

    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: "Please provide email and password",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a valid email",
      });
    }
    console.log("before call");

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");
    console.log("after call");

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "Invalid email or password",
      });
    }

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        msg: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "3d" },
    );

    return res.status(200).json({
      success: true,
      msg: "User Login Successfully",
      role: "User",
      token: token,
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      msg: "Service Unavailable",
      error: error.message,
    });
  }
});

// get user details
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const data = await User.findById(req.params.id).select("-password").lean();

    if (!data) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "User details fetched successfully",
      data: data,
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch user details",
      error: error.message,
    });
  }
});

// update user details
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { name, mobile } = req.body;

    // Only allow updating specific fields
    const allowedFields = { name, mobile };
    Object.keys(allowedFields).forEach(
      (key) => allowedFields[key] === undefined && delete allowedFields[key],
    );

    if (Object.keys(allowedFields).length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No fields to update",
      });
    }

    if (name && name.length < 3) {
      return res.status(400).json({
        success: false,
        msg: "Name must be at least 3 characters long",
      });
    }

    if (mobile && !validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a valid mobile number",
      });
    }

    const data = await User.findByIdAndUpdate(req.params.id, allowedFields, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!data) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "User details updated successfully",
      data: data,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to update user details",
      error: error.message,
    });
  }
});

// delete user
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const data = await User.findByIdAndDelete(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to delete user",
      error: error.message,
    });
  }
});

// change password
router.patch("/change-password/:id", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        msg: "Please provide old password and new password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        msg: "New passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 8 characters long",
      });
    }

    const user = await User.findById(req.params.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    const isOldPasswordMatch = await user.matchPassword(oldPassword);

    if (!isOldPasswordMatch) {
      return res.status(401).json({
        success: false,
        msg: "Incorrect old password",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      msg: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to change password",
      error: error.message,
    });
  }
});

// get all users (Admin only)
router.get("/", verifyToken, async (req, res) => {
  try {
    const data = await User.find({}).select("-password").lean();

    return res.status(200).json({
      success: true,
      msg: "All users fetched successfully",
      data: data,
    });
  } catch (error) {
    console.error("Fetch all users error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch users",
      error: error.message,
    });
  }
});

module.exports = router;
