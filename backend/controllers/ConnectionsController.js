const crypto = require("crypto");
const mongoose = require("mongoose");
const mysql = require("mysql2/promise");
const { Client } = require("pg");
const redis = require("../config/redis");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const extractSchema = async (req, res, next) => {
  const { dbType, connectionString, userId } = req.body;

  if (!dbType || !connectionString) {
    return res
      .status(400)
      .json({ message: "Missing userId, dbType, or connectionString." });
  }

  const redisKey = `schema:${userId}`;

  try {
    // 🔁 1. Try Redis cache first
    const cached = await redis.get(redisKey);
    if (cached) {
      console.log("✅ Schema served from Redis");
      req.body.schema = JSON.parse(cached);
      return next();
    }

    let schema = {};

    // 2. MongoDB schema extraction
    if (dbType === "mongo") {
      const conn = await mongoose.createConnection(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      const collections = await conn.db.listCollections().toArray();

      for (let col of collections) {
        const docs = await conn.db.collection(col.name).findOne();
        schema[col.name] = docs ? Object.keys(docs) : [];
      }

      await conn.close();
    }

    // 3. MySQL schema extraction
    else if (dbType === "mysql") {
      const conn = await mysql.createConnection(connectionString);
      const [tables] = await conn.query(`SHOW TABLES`);

      for (let row of tables) {
        const tableName = Object.values(row)[0];
        const [columns] = await conn.query(
          `SHOW COLUMNS FROM \`${tableName}\``
        );
        schema[tableName] = columns.map((col) => col.Field);
      }

      await conn.end();
    }

    // 4. PostgreSQL schema extraction
    else if (dbType === "postgres") {
      const client = new Client({
        connectionString,
        ssl: {
          rejectUnauthorized: false, // ✅ Accept self-signed certificates
        },
      });

      await client.connect();

      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type='BASE TABLE'
      `);

      for (let row of tablesResult.rows) {
        const tableName = row.table_name;
        const columnsRes = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = '${tableName}'
        `);
        schema[tableName] = columnsRes.rows.map((col) => col.column_name);
      }

      await client.end();
    }

    // 5. Store in Redis for 24 hours
    await redis.set(redisKey, JSON.stringify(schema), "EX", 86400);
    console.log("✅ Schema cached in Redis for user:", userId);

    req.body.schema = schema;
    next();
  } catch (e) {
    console.error("❌ Schema extraction error:", e.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: e.message });
  }
};
const executeGeneratedQuery = async (req, res) => {
  const { connectionString, dbType, generatedQuery } = req.body;

  if (!generatedQuery) {
    return res.status(400).json({ error: "No generated query found." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let queryExecutor, cleanup;
    if (dbType === "mysql") {
      const conn = await mysql.createConnection(connectionString);
      queryExecutor = async (q) => {
        const [rows] = await conn.query(q);
        return rows;
      };
      cleanup = async () => await conn.end();
    } else if (dbType === "postgres") {
      const parsed = new URL(connectionString);
      const client = new Client({
        host: parsed.hostname,
        port: parsed.port,
        user: parsed.username,
        password: parsed.password,
        database: parsed.pathname.slice(1),
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      queryExecutor = async (q) => {
        const { rows } = await client.query(q);
        return rows;
      };
      cleanup = async () => await client.end();
    } else {
      return res.status(400).json({ error: "Unsupported database type." });
    }

    // Get table name
    const tableMatch = /FROM\s+(\w+)/i.exec(generatedQuery);
    const table = tableMatch?.[1];
    if (!table) {
      await cleanup?.();
      return res.status(400).json({ error: "Table not found in query." });
    }

    // Get columns
    const columnsData = await queryExecutor(`SELECT * FROM ${table} LIMIT 1`);
    const columns = columnsData?.length > 0 ? Object.keys(columnsData[0]) : [];

    // Get distinct values
    const columnValuesMap = {};
    for (const col of columns) {
      try {
        const vals = await queryExecutor(
          `SELECT DISTINCT ${col} FROM ${table} LIMIT 50`
        );
        columnValuesMap[col] = vals.map((row) => row[col]);
      } catch (err) {
        console.warn(`⚠️ Skipped column "${col}" due to error: ${err.message}`);
      }
    }

    // Gemini Prompt
    const prompt = `
  You are an expert SQL assistant. Fix the user's SQL query by aligning filter values with the real column data.
  
  Original Query:
  ${generatedQuery}
  
  Table: ${table}
  Available Columns: ${columns.join(", ")}
  
  Available Values:
  ${Object.entries(columnValuesMap)
    .map(([col, vals]) => `${col}: [${vals.slice(0, 10).join(", ")}]`)
    .join("\n")}
  
  Return only the corrected SQL query.
      `;

    const aiResponse = await model.generateContent(prompt);
    let correctedQuery =
      aiResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      generatedQuery;

    // Remove any markdown formatting (```sql)
    correctedQuery = correctedQuery.replace(/```sql|```/gi, "").trim();

    const finalResult = await queryExecutor(correctedQuery);

    await cleanup?.();

    return res.status(200).json({
      success: true,
      originalQuery: generatedQuery,
      correctedQuery,
      data: finalResult,
    });
  } catch (err) {
    console.error("❌ Execution failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { extractSchema, executeGeneratedQuery };
