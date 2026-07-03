import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const CLONE_BASE_DIR = process.env.CLONE_BASE_DIR ?? "/tmp/repomind_repos";

/**
 * Clones a GitHub repository into a unique temp folder.
 * @param repoUrl - The HTTPS URL of the repository (e.g. https://github.com/owner/repo)
 * @returns The absolute path to the cloned repository folder.
 */
export async function cloneRepo(repoUrl: string): Promise<string> {
  // Ensure the base directory exists
  await fs.mkdir(CLONE_BASE_DIR, { recursive: true });

  // Give each clone a unique directory to avoid collisions
  const cloneDir = path.join(CLONE_BASE_DIR, uuidv4());

  console.log(`[Clone] Cloning ${repoUrl} → ${cloneDir}`);

  const git = simpleGit();
  await git.clone(repoUrl, cloneDir, ["--depth", "1"]); // shallow clone for speed

  console.log(`[Clone] Done: ${cloneDir}`);
  return cloneDir;
}

/**
 * Recursively removes a cloned repository directory from disk.
 * Always call this after embedding is complete.
 */
export async function cleanupRepo(cloneDir: string): Promise<void> {
  console.log(`[Clone] Cleaning up ${cloneDir}`);
  await fs.rm(cloneDir, { recursive: true, force: true });
  console.log(`[Clone] Cleanup complete.`);
}
