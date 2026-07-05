import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";

async function main() {
  const embedder = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    modelName: "text-embedding-004",
  });
  const vectors = await embedder.embedDocuments(["const a = 1;"]);
  console.log("Vectors:", vectors);
}
main();
