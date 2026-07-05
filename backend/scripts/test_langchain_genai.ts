import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";

async function main() {
  const embedder = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    modelName: "gemini-embedding-2",
  });
  const vectors = await embedder.embedDocuments(["const a = 1;"]);
  console.log("Vector length:", vectors.length);
  if (vectors.length > 0) {
    console.log("First vector dimension:", vectors[0].length);
  }
}
main();
