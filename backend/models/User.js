const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String, // (if needed, or use OAuth)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
