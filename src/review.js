import Groq from 'groq-sdk';
import { APIKeyMissingError, APIResponseError } from './errors.js';

/**
 * Build the system prompt for code review mode.
 *
 * @returns {string} system prompt
 */
function buildReviewSystemPrompt() {
     return `You are a senior software engineer doing a pre-commit code review.

Your job is to review the staged git diff and find:
1. Bugs or potential runtime errors
2. Security issues (hardcoded secrets, SQL injection, XSS etc)
3. Performance problems
4. Bad practices or code smells
5. Missing error handling
6. Positive feedback on good code

RESPONSE FORMAT — respond in this exact format, no markdown, no extra text:

ISSUES
file.js line X | WARNING | short description | how to fix it
file.js line X | SUGGESTION | short description | what to consider

POSITIVES
short positive observation
short positive observation

SUMMARY
One sentence overall assessment.

RULES:
- Maximum 5 issues total
- Maximum 3 positives
- Be specific — mention exact file and line number when possible
- If no issues found, write ISSUES followed by NONE
- Keep each line under 100 characters
- Do not use markdown, bullets, or formatting`;
}


/**
 * Review staged changes using AI before committing.
 *
 * @param {string} diff - the staged git diff
 * @param {string[]} files - list of staged filenames
 * @param {object} options - options
 * @param {string} options.apiKey - Groq API key
 * @param {string} options.model - model to use
 * @returns {Promise<object>} parsed review result
 * @throws {APIKeyMissingError} if no API key
 * @throws {APIResponseError} if API call fails
 */
export async function reviewStagedChanges(diff, files, options) {
    const { apiKey, model } = options;

    if(!apiKey || apiKey.trim() === '') {
        throw new APIKeyMissingError(
            "API key is missing. Run 'gcommit config --set apiKey=YOUR_KEY'"
        );
    }

    const client = new Groq({ apiKey });

    const userPrompt = `Review this staged git diff before I commit it.

Changed files:
${files.map(f => `  - ${f}`).join('\n')}

Diff:
${diff}`;

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: buildReviewSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new APIResponseError('API returned empty review.');
    }

    return parseReview(text);
  }catch (err) {
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


/**
 * Parse the raw AI review text into a structured object.
 *
 * @param {string} raw - raw text from AI
 * @returns {object} structured review
 */
function parseReview(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  const issues = [];
  const positives = [];
  let summary = '';
  let section = null;

  for (const line of lines) {
    if (line === 'ISSUES') { section = 'issues'; continue; }
    if (line === 'POSITIVES') { section = 'positives'; continue; }
    if (line === 'SUMMARY') { section = 'summary'; continue; }

    if (section === 'issues' && line !== 'NONE') {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        issues.push({
          location: parts[0],
          severity: parts[1],
          description: parts[2],
          fix: parts[3],
        });
      }
    }

    if (section === 'positives') {
      positives.push(line);
    }

    if (section === 'summary') {
      summary = line;
    }
  }

  return { issues, positives, summary };
}