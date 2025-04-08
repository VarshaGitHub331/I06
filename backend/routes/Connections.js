const express = require("express");
const mongoose = require("mongoose");
const mysql = require("mysql2/promise");
const { Client } = require("pg");
const { parse } = require("pg-connection-string"); // 👈 Install this: npm install pg-connection-string
const Connection = require("../models/Connection");

const router = express.Router();
const {
  extractSchema,
  executeGeneratedQuery,
} = require("../controllers/ConnectionsController");
const { generateQueryFromPrompt } = require("../controllers/AIControllers");
function detectDbType(connectionString) {
  if (connectionString.startsWith("mongodb")) return "mongo";
  if (connectionString.startsWith("mysql")) return "mysql";
  if (
    connectionString.startsWith("postgres") ||
    connectionString.startsWith("postgresql")
  )
    return "postgres";
  return null;
}

router.post(
  "/generateQuery",
  async (req, res, next) => {
    const { connectionString } = req.body;

    const dbType = detectDbType(connectionString);
    if (!dbType)
      return res.status(400).json({ error: "Unsupported database type." });

    try {
      if (dbType === "mongo") {
        const testConn = await mongoose.createConnection(connectionString, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        await testConn.db.admin().ping();
        await testConn.close();
      }

      if (dbType === "mysql") {
        // Convert connection string to URL object and remove ssl-mode
        const mysqlUrl = new URL(connectionString);
        mysqlUrl.searchParams.delete("ssl-mode");

        const conn = await mysql.createConnection(mysqlUrl.toString());
        await conn.query("SELECT 1");
        await conn.end();
      }
      if (dbType === "postgres") {
        const parsed = parse(connectionString); // 🔍 Parses host, user, password, db, port
        const client = new Client({
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          ssl: {
            rejectUnauthorized: false, // ✅ Accept self-signed cert
          },
        });

        await client.connect();
        await client.query("SELECT 1");
        await client.end();
      }
      console.log("✅ DB connection successful");

      req.body.dbType = dbType; // Add dbType to the request body for the next middleware
      next();
    } catch (err) {
      console.error("❌ DB connection failed:", err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  },
  extractSchema,
  generateQueryFromPrompt,
  executeGeneratedQuery
);
router.post("/connect", async (req, res, next) => {
  const { connectionString, userId, alias } = req.body;

  const dbType = detectDbType(connectionString);
  if (!dbType)
    return res.status(400).json({ error: "Unsupported database type." });

  try {
    if (dbType === "mongo") {
      const testConn = await mongoose.createConnection(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await testConn.db.admin().ping();
      await testConn.close();
    }

    if (dbType === "mysql") {
      // Convert connection string to URL object and remove ssl-mode
      const mysqlUrl = new URL(connectionString);
      mysqlUrl.searchParams.delete("ssl-mode");

      const conn = await mysql.createConnection(mysqlUrl.toString());
      await conn.query("SELECT 1");
      await conn.end();
    }
    if (dbType === "postgres") {
      const parsed = parse(connectionString); // 🔍 Parses host, user, password, db, port
      const client = new Client({
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        ssl: {
          rejectUnauthorized: false, // ✅ Accept self-signed cert
        },
      });

      await client.connect();
      await client.query("SELECT 1");
      await client.end();
    }
    console.log("✅ DB connection successful");
    const newConn = new Connection({
      userId: new mongoose.Types.ObjectId(userId), // ✅ converts string to ObjectId
      dbType,
      connectionString,
      alias,
    });

    await newConn.save();

    res.status(200).json({
      success: true,
      message: "Connection saved successfully",
      connectionId: newConn._id, // Return the connection ID
    });
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});
module.exports = router;
