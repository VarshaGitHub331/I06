const express = require("express");
const mongoose = require("mongoose");
const mysql = require("mysql2/promise");
const { Client } = require("pg");
const { parse } = require("pg-connection-string"); // 👈 Install this: npm install pg-connection-string
const Connection = require("../models/Connection");
const { MongoClient } = require("mongodb");

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
    console.log(dbType);
    if (!dbType)
      return res.status(400).json({ error: "Unsupported database type." });

    try {
      if (dbType === "mongo") {
        const client = new MongoClient(connectionString);
        await client.connect();
        await client.db().command({ ping: 1 });
        await client.close();
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
      const client = new MongoClient(connectionString);
      await client.connect();
      await client.db().command({ ping: 1 });
      await client.close();
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
router.get("/getConnections/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const connections = await Connection.find({ userId });
    res.status(200).json(connections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/fetchSchema", async (req, res) => {
  const { connectionString } = req.query;
  console.log(connectionString);
  const dbType = detectDbType(connectionString);
  console.log("DB Type:", dbType);
  try {
    if (dbType == "mongo") {
      const client = new MongoClient(connectionString);
      await client.connect();

      const dbName = new URL(connectionString).pathname.replace("/", "");
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      await client.close();

      return res.json({
        success: true,
        type: "mongodb",
        schema: collections.map((c) => c.name),
      });
    }

    if (dbType == "postgresql" || dbType == "postgres") {
      const client = new Client({ connectionString });
      await client.connect();

      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      await client.end();

      return res.json({
        success: true,
        type: "postgresql",
        schema: result.rows.map((r) => r.table_name),
      });
    }

    if (dbType == "mysql") {
      const connection = await mysql.createConnection(connectionString);
      const [rows] = await connection.query("SHOW TABLES");
      await connection.end();

      const tableNames = rows.map((row) => Object.values(row)[0]);

      return res.json({
        success: true,
        type: "mysql",
        schema: tableNames,
      });
    }

    return res
      .status(400)
      .json({ success: false, message: "Unsupported or unknown DB type" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schema",
      error: err.message,
    });
  }
});
router.post("/fetchData", async (req, res) => {
  const { connectionString, type, tableName } = req.body;

  try {
    if (!connectionString || !type || !tableName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (type === "mysql") {
      const connection = await mysql.createConnection(connectionString);
      const [rows] = await connection.execute(
        `SELECT * FROM \`${tableName}\` LIMIT 100`
      );
      await connection.end();
      return res.json({ data: rows });
    } else if (type == "postgresql" || type == "postgres") {
      const client = new Client({ connectionString });
      await client.connect();
      const result = await client.query(
        `SELECT * FROM "${tableName}" LIMIT 100`
      );
      await client.end();
      return res.json({ data: result.rows });
    } else if (type === "mongo") {
      const client = new MongoClient(connectionString);
      await client.connect();
      const db = client.db(); // uses default DB from URI
      const collection = db.collection(tableName);
      const docs = await collection.find({}).limit(100).toArray();
      await client.close();
      return res.json({ data: docs });
    } else {
      return res.status(400).json({ message: "Unsupported database type." });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch data.", error: error.message });
  }
});
module.exports = router;
