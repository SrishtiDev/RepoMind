require('dotenv').config();
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

async function run() {
  const modelsToTest = [
    "text-embedding-004", 
    "embedding-001", 
    "gemini-embedding-001",
    "gemini-embedding-2-preview",
    "gemini-embedding-2",
    "embedding-004"
  ];
  for (const m of modelsToTest) {
    try {
      const embedder = new GoogleGenerativeAIEmbeddings({
        model: m,
        apiKey: process.env.GOOGLE_API_KEY || "fake",
      });
      const vec = await embedder.embedQuery("hello");
      console.log(`${m} dims:`, vec.length);
    } catch (err) {
      console.error(`${m} failed:`, err.message.substring(0, 100));
    }
  }
}
run();
