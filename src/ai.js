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
  }  catch (err) {
    if (err instanceof APIKeyMissingError || err instanceof APIResponseError) {
      throw err;
    }

    // Groq rate limit hit
    if (err.message?.includes('rate_limit') || err.message?.includes('429')) {
      throw new APIResponseError(
        `Groq API rate limit reached.\n\n` +
        `  Options:\n` +
        `  1. Wait a minute and try again\n` +
        `  2. Get a new free key at console.groq.com\n` +
        `  3. Update your key: gcommit config --set apiKey=NEW_KEY\n` +
        `  4. Switch model: gcommit config --set model=llama3-8b-8192`
      );
    }

    // Invalid or expired API key
    if (err.message?.includes('401') || err.message?.includes('invalid_api_key')) {
      throw new APIResponseError(
        `Invalid or expired API key.\n\n` +
        `  Fix: gcommit config --set apiKey=YOUR_NEW_KEY\n` +
        `  Get a free key at: console.groq.com`
      );
    }

    throw new APIResponseError(`API request failed: ${err.message}`);
  }
}