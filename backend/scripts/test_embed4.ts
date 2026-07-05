import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";

async function main() {
  const embedder = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "embedding-001",
  });
  const vectors = await embedder.embedDocuments(["const a = 1;"]);
  console.log("embedding-001 length:", vectors[0]?.length);
  
  const embedder4 = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "text-embedding-004",
  });
  const vectors4 = await embedder4.embedDocuments(["const a = 1;"]);
  console.log("text-embedding-004 length:", vectors4[0]?.length);
  
  const embedder4b = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "models/text-embedding-004",
  });
  const vectors4b = await embedder4b.embedDocuments(["const a = 1;"]);
  console.log("models/text-embedding-004 length:", vectors4b[0]?.length);
}
main();
