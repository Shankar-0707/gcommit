// src/ai.js
import Groq from 'groq-sdk';
import { APIKeyMissingError, APIResponseError } from './errors.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';

/**
 * Generate a conventional commit message suggestion using Groq API.
 *
 * @param {string} diff - the staged git diff
 * @param {string[]} files - list of staged filenames
 * @param {object} options - generation options
 * @param {string} options.apiKey - Groq API key
 * @param {string} options.model - model ID to use
 * @param {string} [options.language='en'] - language for the commit description
 * @returns {Promise<string>} the suggested commit message (trimmed)
 * @throws {APIKeyMissingError} if no API key is provided
 * @throws {APIResponseError} if the API call fails
 */
export async function generateCommitMessage(diff, files, options) {
  const { apiKey, model, language = 'en' } = options;

  if (!apiKey || apiKey.trim() === '') {
    throw new APIKeyMissingError(
      "API key missing. Run 'gcommit config --set apiKey YOUR_KEY' or set GROQ_API_KEY env var."
    );
  }

  const client = new Groq({ apiKey });

  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = buildUserPrompt(diff, files);

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 256,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new APIResponseError('API returned an empty response.');
    }

    return text;
  } catch (err) {
    if (err instanceof APIKeyMissingError || err instanceof APIResponseError) {
      throw err;
    }

    throw new APIResponseError(`API request failed: ${err.message}`);
  }
}