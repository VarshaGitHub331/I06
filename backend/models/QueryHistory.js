const mongoose = require("mongoose");

const querySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  dbConnectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Connection",
  },

  queryText: String,
  resultSample: mongoose.Schema.Types.Mixed, // could store a JSON object or summary
  executedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QueryHistory", querySchema);
