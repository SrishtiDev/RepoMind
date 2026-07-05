import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent("Hello world");
  console.log("Vector dimension 001:", result.embedding.values.length);
}
main();
