require('dotenv').config();
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

async function run() {
  try {
    const embedder = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004", // test
      apiKey: process.env.GOOGLE_API_KEY || "fake",
    });
    const vec = await embedder.embedQuery("hello");
    console.log("text-embedding-004 dims:", vec.length);
  } catch (err) {
    console.error("text-embedding-004 failed:", err.message);
  }

  try {
    const embedder2 = new GoogleGenerativeAIEmbeddings({
      model: "embedding-001",
      apiKey: process.env.GOOGLE_API_KEY || "fake",
    });
    const vec2 = await embedder2.embedQuery("hello");
    console.log("embedding-001 dims:", vec2.length);
  } catch (err) {
    console.error("embedding-001 failed:", err.message);
  }
}
run();
