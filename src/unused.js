// src/unused.js
import { execa } from 'execa';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Groq from 'groq-sdk';
import { APIKeyMissingError, APIResponseError } from './errors.js';

/**
 * Get all JS/TS files in the project recursively
 * using git ls-files so we only scan tracked files.
 *
 * @returns {Promise<string[]>} list of file paths
 */
export async function getProjectFiles() {
  try {
    const { stdout } = await execa('git', [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
    ]);

    return stdout
      .split('\n')
      .filter(Boolean)
      .filter(f =>
        f.endsWith('.js') ||
        f.endsWith('.ts') ||
        f.endsWith('.jsx') ||
        f.endsWith('.tsx') ||
        f.endsWith('.mjs')
      )
      .filter(f =>
        !f.includes('node_modules') &&
        !f.includes('dist/') &&
        !f.includes('coverage/') &&
        !f.includes('.test.') &&
        !f.includes('.spec.')
      );
  } catch {
    return [];
  }
}

/**
 * Read file contents safely.
 *
 * @param {string} filePath - path to the file
 * @returns {string} file contents or empty string
 */
function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Extract all function declarations from a file.
 *
 * @param {string} content - file content
 * @param {string} filePath - file path for reference
 * @returns {Array<{name: string, line: number, file: string}>}
 */
function extractFunctions(content, filePath) {
  const functions = [];
  const lines = content.split('\n');

  const patterns = [
    // function declaration: function myFunc()
    /^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
    // arrow function: const myFunc = () =>
    /^(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/,
    // arrow function: const myFunc = async () =>
    /^(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s*\(/,
  ];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        functions.push({
          name: match[1],
          line: index + 1,
          file: filePath,
        });
        break;
      }
    }
  });

  return functions;
}

/**
 * Extract all variable declarations from a file.
 *
 * @param {string} content - file content
 * @param {string} filePath - file path
 * @returns {Array<{name: string, line: number, file: string}>}
 */
function extractVariables(content, filePath) {
  const variables = [];
  const lines = content.split('\n');

  const pattern = /^(?:export\s+)?(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=/;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      variables.push({
        name: match[1],
        line: index + 1,
        file: filePath,
      });
    }
  });

  return variables;
}

/**
 * Check if a name is used anywhere in the codebase
 * excluding its own declaration line.
 *
 * @param {string} name - function or variable name
 * @param {string} declaredInFile - file where it's declared
 * @param {number} declaredOnLine - line where it's declared
 * @param {Array<{file: string, content: string}>} allFiles - all project files
 * @returns {boolean} true if used somewhere
 */
function isUsedAnywhere(name, declaredInFile, declaredOnLine, allFiles) {
  // Regex to find usage (not declaration)
  const usagePattern = new RegExp(`\\b${name}\\b`, 'g');

  for (const { file, content } of allFiles) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Skip the declaration line itself
      if (file === declaredInFile && lineNum === declaredOnLine) return;

      // Skip comment lines
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      if (usagePattern.test(line)) {
        usagePattern.lastIndex = 0;
        return true;
      }
      usagePattern.lastIndex = 0;
    });

    // Re-check properly
    const fullContent = content;
    const contentLines = fullContent.split('\n');
    for (let i = 0; i < contentLines.length; i++) {
      const lineNum = i + 1;
      if (file === declaredInFile && lineNum === declaredOnLine) continue;
      const trimmed = contentLines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
      if (new RegExp(`\\b${name}\\b`).test(contentLines[i])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find empty or near-empty files in the project.
 *
 * @param {Array<{file: string, content: string}>} allFiles
 * @returns {string[]} list of empty file paths
 */
function findEmptyFiles(allFiles) {
  return allFiles
    .filter(({ content }) => content.trim().length < 10)
    .map(({ file }) => file);
}

/**
 * Main function — scan the project for unused code.
 *
 * @returns {Promise<object>} scan results
 */
export async function scanUnusedCode() {
  const filePaths = await getProjectFiles();

  if (filePaths.length === 0) {
    return {
      unusedFunctions: [],
      unusedVariables: [],
      emptyFiles: [],
      totalFiles: 0,
    };
  }

  // Read all files into memory once
  const allFiles = filePaths.map(file => ({
    file,
    content: readFile(file),
  }));

  const unusedFunctions = [];
  const unusedVariables = [];

  for (const { file, content } of allFiles) {
    if (!content) continue;

    // Check functions
    const functions = extractFunctions(content, file);
    for (const fn of functions) {
      // Skip main entry points and common patterns
      if (['main', 'init', 'setup', 'default'].includes(fn.name)) continue;
      if (!isUsedAnywhere(fn.name, fn.file, fn.line, allFiles)) {
        unusedFunctions.push(fn);
      }
    }

    // Check constants (UPPER_CASE only — likely unused if not referenced)
    const variables = extractVariables(content, file);
    for (const variable of variables) {
      if (!isUsedAnywhere(variable.name, variable.file, variable.line, allFiles)) {
        unusedVariables.push(variable);
      }
    }
  }

  const emptyFiles = findEmptyFiles(allFiles);

  return {
    unusedFunctions,
    unusedVariables,
    emptyFiles,
    totalFiles: filePaths.length,
  };
}

/**
 * Use AI to give a smart summary and recommendations
 * based on the scan results.
 *
 * @param {object} scanResults - results from scanUnusedCode()
 * @param {object} options - api options
 * @param {string} options.apiKey - Groq API key
 * @param {string} options.model - model to use
 * @returns {Promise<string>} AI summary
 */
export async function getAISummary(scanResults, options) {
  const { apiKey, model } = options;

  if (!apiKey) throw new APIKeyMissingError('API key missing.');

  const client = new Groq({ apiKey });

  const prompt = `You are a senior engineer reviewing unused code findings.

Here are the unused code items found in a JavaScript project:

Unused Functions (${scanResults.unusedFunctions.length}):
${scanResults.unusedFunctions.map(f => `  - ${f.name}() in ${f.file} at line ${f.line}`).join('\n') || '  None'}

Unused Variables (${scanResults.unusedVariables.length}):
${scanResults.unusedVariables.map(v => `  - ${v.name} in ${v.file} at line ${v.line}`).join('\n') || '  None'}

Empty Files (${scanResults.emptyFiles.length}):
${scanResults.emptyFiles.join('\n') || '  None'}

Total files scanned: ${scanResults.totalFiles}

Give a 2-3 sentence plain English summary of what was found and what the developer should do.
No markdown, no bullet points, no formatting. Just plain sentences.`;

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    throw new APIResponseError(`AI summary failed: ${err.message}`);
  }
}

/**
 * Export the scan results to a text report file.
 *
 * @param {object} scanResults - results from scanUnusedCode()
 * @param {string} aiSummary - AI generated summary
 * @returns {string} the report content
 */
export function generateReport(scanResults, aiSummary) {
  const lines = [];
  const date = new Date().toISOString().split('T')[0];

  lines.push(`gcommit unused — Code Analysis Report`);
  lines.push(`Generated: ${date}`);
  lines.push(`Files scanned: ${scanResults.totalFiles}`);
  lines.push('');
  lines.push('─'.repeat(50));
  lines.push('');

  if (aiSummary) {
    lines.push('AI Summary:');
    lines.push(aiSummary);
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');
  }

  lines.push(`Unused Functions (${scanResults.unusedFunctions.length}):`);
  if (scanResults.unusedFunctions.length === 0) {
    lines.push('  None found.');
  } else {
    for (const fn of scanResults.unusedFunctions) {
      lines.push(`  ${fn.file}:${fn.line} — ${fn.name}()`);
    }
  }

  lines.push('');
  lines.push(`Unused Variables (${scanResults.unusedVariables.length}):`);
  if (scanResults.unusedVariables.length === 0) {
    lines.push('  None found.');
  } else {
    for (const v of scanResults.unusedVariables) {
      lines.push(`  ${v.file}:${v.line} — ${v.name}`);
    }
  }

  lines.push('');
  lines.push(`Empty Files (${scanResults.emptyFiles.length}):`);
  if (scanResults.emptyFiles.length === 0) {
    lines.push('  None found.');
  } else {
    for (const f of scanResults.emptyFiles) {
      lines.push(`  ${f}`);
    }
  }

  return lines.join('\n');
}