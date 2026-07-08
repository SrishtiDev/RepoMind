import "dotenv/config";
export interface IngestionJobData {
    repoUrl: string;
}
/**
 * Adds an ingestion job to the BullMQ queue.
 * The worker will pick it up and run clone → chunk → embed.
 */
export declare function addIngestionJob(data: IngestionJobData): Promise<string>;
//# sourceMappingURL=producer.d.ts.map