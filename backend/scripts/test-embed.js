require('dotenv').config();
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

async function run() {
  try {
    const embedder = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY || "fake",
    });
    console.log("Model initialized:", embedder.model);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
