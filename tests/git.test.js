import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStagedDiff, getStagedFiles } from '../src/git.js';
import { NoStagedChangesError, GitNotFoundError } from '../src/errors.js';

// Mock the entire execa module so no real git runs
vi.mock('execa');

import { execa } from 'execa';

describe('getStagedDiff', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns the diff string when there are staged changes', async () => {
        execa.mockResolvedValue({ stdout: 'diff --git a/foo.js b/foo.js\n+added line' });

        const result = await getStagedDiff();
        expect(result).toContain('added line');
    });

    it('throws NoStagedChangesError when there are no staged changes', async () => {
        execa.mockResolvedValue({ stdout: '' });

        await expect(getStagedDiff()).rejects.toThrow(NoStagedChangesError);
    });

    it('throws GitNotFoundError when git is not installed', async () => {
        const err = new Error('git not found');
        err.code = 'ENOENT';
        execa.mockRejectedValue(err);
        
        await expect(getStagedDiff()).rejects.toThrow(GitNotFoundError);
    });
});

describe('getStagedFiles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns an array of filenames', async () => {
    execa.mockResolvedValue({ stdout: 'src/foo.js\nsrc/bar.js\n' });

    const files = await getStagedFiles();
    expect(files).toEqual(['src/foo.js', 'src/bar.js']);
  });

  it('returns empty array when no files are staged', async () => {
    execa.mockResolvedValue({ stdout: '' });

    const files = await getStagedFiles();
    expect(files).toEqual([]);
  });
});