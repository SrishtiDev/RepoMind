require('dotenv').config();
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

async function run() {
  try {
    const embedder = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY || "fake",
    });
    const vec = await embedder.embedQuery("hello");
    console.log("Dim:", vec.length);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
