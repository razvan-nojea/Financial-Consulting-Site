/**
 * Shared utilities for the JSON file-backed repositories.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Creates the directory that will hold `filePath` if it does not already exist.
 * @param {string} filePath  absolute or relative path to the data file
 */
export function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
