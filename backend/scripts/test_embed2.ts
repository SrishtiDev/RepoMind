import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";

async function main() {
  const embedder = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "text-embedding-004",
  });
  const vectors = await embedder.embedDocuments(["const a = 1;"]);
  console.log("Vector length:", vectors.length);
  if (vectors.length > 0) {
    console.log("First vector type:", typeof vectors[0]);
    console.log("First vector length:", Array.isArray(vectors[0]) ? vectors[0].length : 'not an array');
    console.log("First vector content preview:", JSON.stringify(vectors[0]).slice(0, 100));
  }
}
main();
