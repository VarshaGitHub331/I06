const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
require("dotenv").config(); // ← this loads .env before anything else
const upload = require("../utils/Multer");
const cloudinary = require("../utils/Cloudinary");
const fs = require("fs");
const axios = require("axios");
// @route   POST /api/auth/register
// @desc    Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // create token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // respond with token and user info
    return res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/login
// @desc    Login user and return token
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // check user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/upload-audio", upload.single("audio"), async (req, res) => {
  console.log("Received audio file:", req.file);
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }
  try {
    const filePath = req.file.path;

    // Upload to Cloudinary (audio treated as 'video')
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      folder: "audio_uploads",
    });

    // Delete the local file after uploading to cloudinary
    fs.unlinkSync(filePath);

    // Call FastAPI server with Cloudinary audio URL
    const response = await axios.post(
      "https://69d6-34-48-56-59.ngrok-free.app/transcribe",
      {
        url: uploadResult.secure_url,
      }
    );

    return res.json({
      transcription: response.data.transcription,
    });
  } catch (err) {
    console.error("Error in /upload-audio:", err);
    return res
      .status(500)
      .json({ error: "Upload or transcription failed", details: err.message });
  }
});
module.exports = router;
