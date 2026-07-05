import { embedAndStore } from "./src/ingestion/embed";
import "dotenv/config";

async function main() {
  try {
    await embedAndStore([{
      content: "const a = 1;",
      metadata: {
        filename: "test.ts",
        filepath: "src/test.ts",
        chunkIndex: 0,
        repoUrl: "test"
      }
    }]);
    console.log("Success");
  } catch (err: any) {
    console.error("Error:", JSON.stringify(err.data || err.response?.data || err.message));
  }
}
main();
