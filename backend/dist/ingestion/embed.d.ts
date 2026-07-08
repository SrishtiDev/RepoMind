import { CodeChunk } from "./chunker";
import "dotenv/config";
/**
 * Embeds all chunks using Gemini and upserts them into Qdrant.
 * Processes in batches to avoid rate-limiting.
 *
 * @param chunks - Flat array of CodeChunk objects from the chunker
 */
export declare function embedAndStore(chunks: CodeChunk[]): Promise<void>;
//# sourceMappingURL=embed.d.ts.map