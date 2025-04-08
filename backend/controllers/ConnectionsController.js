const mysql = require("mysql2/promise");
const { Client } = require("pg");
const redis = require("../config/redis");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient } = require("mongodb");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractSchema = async (req, res, next) => {
  const { dbType, connectionString } = req.body;

  if (!dbType || !connectionString) {
    return res
      .status(400)
      .json({ message: "Missing userId, dbType, or connectionString." });
  }

  const redisKey = `schema:${connectionString}`;

  try {
    // 🔁 Try Redis cache first
    const cached = await redis.get(redisKey);
    if (cached) {
      console.log("✅ Schema served from Redis");
      req.body.schema = JSON.parse(cached);
      return next();
    }

    let schema = {};

    // MongoDB
    if (dbType === "mongo") {
      const client = new MongoClient(connectionString);
      await client.connect();

      const dbName = new URL(connectionString).pathname.replace("/", "");
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();

      for (const col of collections) {
        const doc = await db.collection(col.name).findOne();
        schema[col.name] = doc ? Object.keys(doc) : [];
      }

      await client.close();
    }

    // MySQL
    else if (dbType === "mysql") {
      const conn = await mysql.createConnection(connectionString);
      const [tables] = await conn.query(`SHOW TABLES`);

      for (const row of tables) {
        const tableName = Object.values(row)[0];
        const [columns] = await conn.query(
          `SHOW COLUMNS FROM \`${tableName}\``
        );
        schema[tableName] = columns.map((col) => col.Field);
      }

      await conn.end();
    }

    // PostgreSQL
    else if (dbType === "postgres") {
      const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });

      await client.connect();

      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type='BASE TABLE'
      `);

      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        const columnsRes = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = '${tableName}'
        `);
        schema[tableName] = columnsRes.rows.map((col) => col.column_name);
      }

      await client.end();
    } else {
      return res.status(400).json({ message: "Unsupported dbType provided." });
    }

    await redis.set(redisKey, JSON.stringify(schema), "EX", 86400);
    console.log("✅ Schema cached in Redis for user:", connectionString);

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
    if (dbType === "mongo") {
      const client = new MongoClient(connectionString);
      await client.connect();

      const dbName = new URL(connectionString).pathname.slice(1);
      const db = client.db(dbName);

      const collections = await db.listCollections().toArray();
      const collectionName = collections[0]?.name;

      if (!collectionName) {
        await client.close();
        return res.status(400).json({ error: "No collections found." });
      }

      let parsedQuery;
      try {
        parsedQuery = eval(`(${generatedQuery})`);
      } catch (err) {
        await client.close();
        console.error("❌ Invalid MongoDB query:", err.message);
        return res.status(400).json({ error: "Invalid MongoDB query format." });
      }

      const sampleDocs = await db
        .collection(collectionName)
        .find({})
        .limit(10)
        .toArray();
      const fields = [
        ...new Set(sampleDocs.flatMap((doc) => Object.keys(doc))),
      ];
      const fieldValuesMap = {};

      for (const field of fields) {
        const uniqueVals = await db
          .collection(collectionName)
          .aggregate([{ $group: { _id: `$${field}` } }, { $limit: 10 }])
          .toArray();
        fieldValuesMap[field] = uniqueVals.map((v) => v._id);
      }

      const mongoPrompt = `
    You are a MongoDB expert. Improve or correct the following MongoDB query.
    
    Original Query:
    ${generatedQuery}
    
    Collection: ${collectionName}
    Available Fields: ${fields.join(", ")}
    
    Sample Values:
    ${Object.entries(fieldValuesMap)
      .map(([k, v]) => `${k}: [${v.join(", ")}]`)
      .join("\n")}
    
    Return only the corrected JavaScript MongoDB query object/array. Don't include any explanation or markdown.
    `;

      const aiResponse = await model.generateContent(mongoPrompt);
      let correctedQuery =
        aiResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        generatedQuery;
      correctedQuery = correctedQuery
        .replace(/```(js|javascript)?|```/gi, "")
        .trim();

      let finalParsed;
      try {
        // Validate that correctedQuery is a plain object/array (not a full db.* call)
        if (
          correctedQuery.startsWith("db.") ||
          correctedQuery.includes(".find(") ||
          correctedQuery.includes(".aggregate(")
        ) {
          throw new Error(
            "Received a full executable query instead of a filter/pipeline object."
          );
        }

        finalParsed = eval(`(${correctedQuery})`);
      } catch (err) {
        console.error("❌ Invalid MongoDB query:", err.message);
        console.log("Corrected Query:", correctedQuery);
        await client.close();
        return res.status(400).json({
          error: "Corrected MongoDB query is invalid or improperly formatted.",
        });
      }

      let data;
      if (Array.isArray(finalParsed)) {
        data = await db
          .collection(collectionName)
          .aggregate(finalParsed)
          .toArray();
      } else {
        data = await db
          .collection(collectionName)
          .find(finalParsed)
          .limit(50)
          .toArray();
      }

      await client.close();
      // Chart Formatting Prompt
      const chartPrompt = `
      You are a data visualization expert. Based on the following data from a database query, return ONLY a valid JSON structure for chart.js with no explanation or extra text. DO NOT include markdown formatting or commentary. 
      
      The JSON must include:
      - A top-level "type" field indicating the chart type ("bar", "pie", or "line").
      - A "labels" array for X-axis or categories.
      - A "datasets" array with one or more datasets.
      
      Only respond with clean JSON. No markdown, no triple backticks, no extra words.
      
      Example response:
      {
        "type": "bar",
        "labels": ["Label1", "Label2"],
        "datasets": [
          {
            "label": "My Dataset",
            "data": [10, 20]
          }
        ]
      }
      
      Data:
      ${JSON.stringify(data.slice(0, 20))}
      `;

      const chartResponse = await model.generateContent(chartPrompt);
      console.log("Chart data could be", chartResponse);
      let chartData;
      try {
        let raw =
          chartResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!raw) throw new Error("No text content from LLM");

        // Remove ```json ... ``` or ``` blocks
        // Remove ```json blocks and smart quotes
        raw = raw
          .trim()
          .replace(/^```(?:json)?/, "")
          .replace(/```$/, "")
          .replace(/[‘’]/g, "'") // Fix single smart quotes
          .replace(/[“”]/g, '"'); // Fix double smart quotes
        console.log(raw + " is the chart data");
        chartData = JSON.parse(raw);
      } catch (err) {
        console.warn("⚠️ Failed to parse chart data. Skipping chart response.");
      }

      return res.status(200).json({
        success: true,
        originalQuery: generatedQuery,
        correctedQuery,
        data,
        chartData,
      });
    }

    // MySQL
    else if (dbType === "mysql") {
      const conn = await mysql.createConnection(connectionString);
      queryExecutor = async (q) => {
        const [rows] = await conn.query(q);
        return rows;
      };
      cleanup = async () => await conn.end();
    }

    // PostgreSQL
    else if (dbType === "postgres") {
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

    // Table name extraction
    const tableMatch = /FROM\s+(\w+)/i.exec(generatedQuery);
    const table = tableMatch?.[1];
    if (!table) {
      await cleanup?.();
      return res.status(400).json({ error: "Table not found in query." });
    }

    // Extract columns
    const columnsData = await queryExecutor(`SELECT * FROM ${table} LIMIT 1`);
    const columns = columnsData?.length > 0 ? Object.keys(columnsData[0]) : [];

    // Collect sample values
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

    correctedQuery = correctedQuery.replace(/```sql|```/gi, "").trim();

    const finalResult = await queryExecutor(correctedQuery);

    await cleanup?.();
    // Chart Formatting Prompt
    const chartPrompt = `
You are a data visualization expert. Based on the following data from a database query, return ONLY a valid JSON structure for chart.js with no explanation or extra text. DO NOT include markdown formatting or commentary. 

The JSON must include:
- A top-level "type" field indicating the chart type ("bar", "pie", or "line").
- A "labels" array for X-axis or categories.
- A "datasets" array with one or more datasets.

Only respond with clean JSON. No markdown, no triple backticks, no extra words.

Example response:
{
  "type": "bar",
  "labels": ["Label1", "Label2"],
  "datasets": [
    {
      "label": "My Dataset",
      "data": [10, 20]
    }
  ]
}

Data:
${JSON.stringify(finalResult.slice(0, 20))}
`;

    const chartResponse = await model.generateContent(chartPrompt);
    console.log("Chart response could be", chartResponse);
    let chartData = null;

    try {
      let raw =
        chartResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!raw) throw new Error("No text content from LLM");

      // Remove ```json ... ``` or ``` blocks
      // Remove ```json blocks and smart quotes
      raw = raw
        .trim()
        .replace(/^```(?:json)?/, "")
        .replace(/```$/, "")
        .replace(/[‘’]/g, "'") // Fix single smart quotes
        .replace(/[“”]/g, '"'); // Fix double smart quotes
      console.log(raw + " is the chart data");
      chartData = JSON.parse(raw);
    } catch (err) {
      console.warn(
        "⚠️ Failed to parse chart data. Skipping chart response.",
        err
      );
    }

    return res.status(200).json({
      success: true,
      originalQuery: generatedQuery,
      correctedQuery,
      data: finalResult,
      chartData,
    });
  } catch (err) {
    console.error("❌ Execution failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { extractSchema, executeGeneratedQuery };
