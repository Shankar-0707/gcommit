import { execa } from "execa";
import { NoStagedChangesError, GitNotFoundError } from './errors.js';

/**
 * Get the staged git diff (git diff --staged).
 * This is the raw diff text that gets sent to the AI.
 *
 * @returns {Promise<string>} the staged diff as a string
 * @throws {GitNotFoundError} if git is not installed
 * @throws {NoStagedChangesError} if there is nothing staged
 */
export async function getStagedDiff() {
    try {
        const { stdout } = await execa('git', ['diff', '--staged']);

        if(!stdout || stdout.trim() === '' ){
            throw new NoStagedChangesError(
                "No Staged Changes found. Run 'git add <file> first."
            );
        }

        return stdout;
    } catch (error) {
        if(error instanceof NoStagedChangesError){
            throw error;
        }

        if(error.code === 'ENOENT'){
            throw new GitNotFoundError(
                "Git not found. Please ensure git is installed and in your PATH."
            );
        }

        throw error;
    }
}

/**
 * Get the list of staged filenames (not their diffs, just names).
 * Used to give the AI extra context about what changed.
 *
 * @returns {Promise<string[]>} array of staged file paths
 * @throws {GitNotFoundError} if git is not installed
 */
export async function getStagedFiles() {
    try {
        const { stdout } = await execa('git', [
            'diff',
            '--staged',
            '--name-only',
        ]);

        if(!stdout || stdout.trim() === '' ){
            return [];
        }

        return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
        if(error.code === 'ENOENT'){
            throw new GitNotFoundError(
                "Git not found. Please ensure git is installed and in your PATH."
            );
        }
        throw error;
    }
}

/**
 * Run git commit with the given message.
 *
 * @param {string} message - the commit message
 * @param {boolean} [noVerify=false] - if true, passes --no-verify to git
 * @returns {Promise<void>}
 */
export async function runCommit(message, noVerify = false) {
    const args = ['commit', '-m', message];
    if(noVerify){
        args.push('--no-verify');
    }

    try {
        await execa('git', args, { stdio: 'inherit' });
    } catch (error) {
        if(error.code === 'ENOENT'){
            throw new GitNotFoundError(
                "Git not found. Please ensure git is installed and in your PATH."
            );
        }
        throw error;
    }
}