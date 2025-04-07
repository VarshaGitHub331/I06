const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  dbType: {
    type: String,
    enum: ["mongo", "mysql", "postgres"],
    required: true,
  },

  // 👇 Just store the full string the user inputs
  connectionString: { type: String, required: true },

  alias: String, // Optional: e.g., "My Production DB"
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Connection", ConnectionSchema);
