// src/prompt.js

/**
 * Build the system prompt that instructs Claude how to behave.
 * This is sent as the "system" role in every API call.
 *
 * @param {string} language - language code e.g. 'en', 'fr', 'hi'
 * @returns {string} the system prompt
 */
export function buildSystemPrompt(language = 'en') {
  const languageInstruction =
    language === 'en'
      ? 'Write the commit description in English.'
      : `Write the commit description in the language with code "${language}". The type and scope must stay in English (e.g. feat, fix), only the description text changes language.`;

  return `You are an expert software engineer writing Git commit messages.

You must follow the Conventional Commits specification strictly.

FORMAT:
type(scope): description

RULES:
- type must be one of: feat, fix, docs, refactor, test, chore, style, perf, ci
- scope is optional but recommended — use the folder or module name (e.g. auth, api, config)
- description must be lowercase, imperative mood, max 72 characters total per line
- Return EXACTLY ONE commit message — no alternatives, no explanation, no markdown, no bullet points
- Do not wrap the output in backticks or quotes
- ${languageInstruction}

EXAMPLES:
feat(auth): add JWT token refresh on expiry
fix(api): handle null response from payment gateway
docs(readme): add installation instructions for windows
refactor(config): extract api key resolution into separate function`;
}

/**
 * Build the user prompt containing the actual diff and file context.
 * This is what changes with every commit — the system prompt stays constant.
 *
 * @param {string} diff - the raw output of git diff --staged
 * @param {string[]} files - list of staged filenames
 * @returns {string} the user prompt
 */
export function buildUserPrompt(diff, files) {
  const fileList = files.length > 0
    ? `Changed files:\n${files.map(f => `  - ${f}`).join('\n')}`
    : 'Changed files: unknown';

  return `${fileList}

Staged diff:
${diff}

Write the conventional commit message for these changes:`;
}