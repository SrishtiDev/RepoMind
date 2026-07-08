import "dotenv/config";
/**
 * Clones a GitHub repository into a unique temp folder.
 * @param repoUrl - The HTTPS URL of the repository (e.g. https://github.com/owner/repo)
 * @returns The absolute path to the cloned repository folder.
 */
export declare function cloneRepo(repoUrl: string): Promise<string>;
/**
 * Recursively removes a cloned repository directory from disk.
 * Always call this after embedding is complete.
 */
export declare function cleanupRepo(cloneDir: string): Promise<void>;
//# sourceMappingURL=clone.d.ts.map