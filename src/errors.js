/**
 * Base error class for all gcommit errors.
 * All custom errors extend this so you can catch GCommitError
 * and know it came from our tool, not from Node internals.
 */
export class GCommitError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Thrown when git diff --staged returns empty output.
 * Fix: user needs to run git add <file> first.
 */
export class NoStagedChangesError extends GCommitError {}

/**
 * Thrown when git binary is not found on the system.
 * Fix: user needs to install git.
 */
export class GitNotFoundError extends GCommitError {}

/**
 * Thrown when no API key is available from any source.
 * Fix: user needs to run gcommit config --set apiKey KEY
 */
export class APIKeyMissingError extends GCommitError {}

/**
 * Thrown when the Anthropic API returns an error response.
 * Includes the original error as context.
 */
export class APIResponseError extends GCommitError {}

/**
 * Thrown when reading or writing config fails.
 */
export class ConfigError extends GCommitError {}

/**
 * Thrown when the staged diff exceeds maxDiffLines.
 * Fix: user should stage fewer files at once.
 */
export class DiffTooLargeError extends GCommitError {
     /**
   * @param {number} lineCount - actual number of lines in the diff
   * @param {number} maxLines - configured maximum
   */
  constructor(lineCount, maxLines) {
    super(`Diff too large (${lineCount} lines). Max allowed is ${maxLines} lines. Stage fewer files at once.`);
    this.lineCount = lineCount;
    this.maxLines = maxLines;
  }
}