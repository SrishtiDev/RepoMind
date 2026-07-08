"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepo = cloneRepo;
exports.cleanupRepo = cleanupRepo;
const simple_git_1 = __importDefault(require("simple-git"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
require("dotenv/config");
const CLONE_BASE_DIR = process.env.CLONE_BASE_DIR ?? "/tmp/repomind_repos";
/**
 * Clones a GitHub repository into a unique temp folder.
 * @param repoUrl - The HTTPS URL of the repository (e.g. https://github.com/owner/repo)
 * @returns The absolute path to the cloned repository folder.
 */
async function cloneRepo(repoUrl) {
    // Ensure the base directory exists
    await promises_1.default.mkdir(CLONE_BASE_DIR, { recursive: true });
    // Give each clone a unique directory to avoid collisions
    const cloneDir = path_1.default.join(CLONE_BASE_DIR, (0, uuid_1.v4)());
    console.log(`[Clone] Cloning ${repoUrl} → ${cloneDir}`);
    const git = (0, simple_git_1.default)();
    await git.clone(repoUrl, cloneDir, ["--depth", "1"]); // shallow clone for speed
    console.log(`[Clone] Done: ${cloneDir}`);
    return cloneDir;
}
/**
 * Recursively removes a cloned repository directory from disk.
 * Always call this after embedding is complete.
 */
async function cleanupRepo(cloneDir) {
    console.log(`[Clone] Cleaning up ${cloneDir}`);
    await promises_1.default.rm(cloneDir, { recursive: true, force: true });
    console.log(`[Clone] Cleanup complete.`);
}
//# sourceMappingURL=clone.js.map