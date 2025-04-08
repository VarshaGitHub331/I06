// app.js
const express = require("express");
const mongoose = require("mongoose");
const UserRouter = require("./routes/User"); // adjust the path if needed
require("dotenv").config(); // ← this loads .env before anything else
const cors = require("cors"); // ← Import cors
const app = express();
const PORT = process.env.PORT || 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MONGODB_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/yourdbname";

// Middleware to parse JSON
app.use(cors()); // ← Enable CORS for all origins
app.use(express.json());
// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Mount your routes
app.use("/user", UserRouter); // All routes from routes/User.js will be prefixed with /user
app.use("/connection", require("./routes/Connections")); // Adjust the path if needed
// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
