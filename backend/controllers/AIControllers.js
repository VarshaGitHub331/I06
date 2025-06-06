const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const generateQueryFromPrompt = async (req, res, next) => {
  console.log("Here in ai controller to generate sql query");
  const { prompt, dbType, schema } = req.body;

  if (!prompt || !dbType || !schema) {
    return res
      .status(400)
      .json({ error: "Prompt, dbType, and schema are required." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    let syntaxHint = "";
    if (dbType === "mongo") {
      syntaxHint = `
        The generated MongoDB query must be only the core part of the query.

Return:
- a plain JavaScript object for a 'find' query, e.g., { age: 25 }
- or an array of stages for an aggregation query, e.g., [ { $match: { age: 25 } } ]

Do NOT include:
- any db.collection(...) code
- .find() or .aggregate() or .toArray()
- variable declarations
- markdown or code blocks

Only return the raw query object or array.
`;
    }

    const queryPrompt = `
You are an expert in ${dbType} databases. Given the schema and the user's natural language instruction, generate a valid and safe ${dbType} query.

Schema:
${JSON.stringify(schema, null, 2)}

Instruction:
${prompt}

${syntaxHint}

Respond ONLY with the generated ${dbType} query. Do NOT wrap the query in markdown or code blocks. Just return the plain query string.
`;

    const aiResponse = await model.generateContent(queryPrompt);

    const candidates = aiResponse?.response?.candidates;
    let rawQuery = candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Defensive cleaning: remove markdown formatting or backticks if they exist
    if (rawQuery.startsWith("```")) {
      rawQuery = rawQuery
        .replace(/```(?:\w+)?\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    // Optional: Remove any trailing semicolons or extra whitespace
    const cleanQuery = rawQuery.replace(/;+$/, "").trim();

    req.body.generatedQuery = cleanQuery;
    console.log(" AI Generated Query:", cleanQuery);
    next();
  } catch (error) {
    console.error("Query generation error:", error.message);
    res.status(500).json({ error: "Failed to generate query" });
  }
};
module.exports = {
  generateQueryFromPrompt,
};
