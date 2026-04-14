import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIKeyMissingError, APIResponseError } from '../src/errors.js';
import { generateCommitMessage } from '../src/ai.js';
// Mock the Groq SDK before importing ai.js
vi.mock('groq-sdk', () => {
  const mockCreate = vi.fn();

  return {
    default: class MockGroq {
      constructor() {
        this.chat = {
          completions: { create: mockCreate },
        };
      }
    },
    __mockCreate: mockCreate,
  };
});

import { generateCommitMessage } from '../src/ai.js';
import { __mockCreate } from 'groq-sdk';

const VALID_OPTIONS = {
  apiKey: 'test-api-key',
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  language: 'en',
};

describe('generateCommitMessage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a trimmed commit message on a valid API response', async () => {
    __mockCreate.mockResolvedValue({
      choices: [{ message: { content: '  feat(auth): add login flow  ' } }],
    });

    const result = await generateCommitMessage('some diff', ['auth.js'], VALID_OPTIONS);
    expect(result).toBe('feat(auth): add login flow');
  });

  it('throws APIKeyMissingError when apiKey is empty', async () => {
    await expect(
      generateCommitMessage('diff', [], { ...VALID_OPTIONS, apiKey: '' })
    ).rejects.toThrow(APIKeyMissingError);
  });

  it('throws APIKeyMissingError when apiKey is not provided', async () => {
    await expect(
      generateCommitMessage('diff', [], { ...VALID_OPTIONS, apiKey: undefined })
    ).rejects.toThrow(APIKeyMissingError);
  });

  it('throws APIResponseError when API returns empty content', async () => {
    __mockCreate.mockResolvedValue({ choices: [] });

    await expect(
      generateCommitMessage('diff', [], VALID_OPTIONS)
    ).rejects.toThrow(APIResponseError);
  });

  it('throws APIResponseError when API call throws', async () => {
    __mockCreate.mockRejectedValue(new Error('Network error'));

    await expect(
      generateCommitMessage('diff', [], VALID_OPTIONS)
    ).rejects.toThrow(APIResponseError);
  });
});