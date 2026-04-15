#!/usr/bin/env node
// src/index.js
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { reviewStagedChanges } from './review.js';
import inquirer from 'inquirer';

import { getStagedDiff, getStagedFiles, runCommit } from './git.js';
import { generateCommitMessage } from './ai.js';
import { getConfig, setConfig, getAllConfig, resolveApiKey } from './config.js';
import {
  showSuggestion,
  showError,
  showSuccess,
  showWarning,
  createSpinner,
  promptUserAction,
  showReview
} from './interactive.js';
import {
  NoStagedChangesError,
  GitNotFoundError,
  APIKeyMissingError,
  APIResponseError,
  DiffTooLargeError,
} from './errors.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

const program = new Command();

program
  .name('gcommit')
  .description('AI-powered git commit message generator')
  .version(pkg.version);

// ─── Main command ────────────────────────────────────────────────────────────
program
  .option('--dry-run', 'show suggestion without committing')
  .option('--model <model>', 'override the AI model for this run')
  .option('--lang <lang>', 'language for the commit message', 'en')
  .option('--no-verify', 'pass --no-verify to git commit')
  .action(async (options) => {
    try {
      // 1. Resolve API key
      const apiKey = resolveApiKey();
      if (!apiKey) {
        showError("API key missing. Run 'gcommit config --set apiKey YOUR_KEY' or set GROQ_API_KEY env var.");
        process.exit(1);
      }

      // 2. Get staged diff
      const spinner = createSpinner('Reading staged changes...');
      spinner.start();

      let diff, files;
      try {
        diff = await getStagedDiff();
        files = await getStagedFiles();
        spinner.succeed('Staged changes found.');
      } catch (err) {
        spinner.fail('Failed to read git diff.');
        if (err instanceof NoStagedChangesError) {
          showError(err.message);
        } else if (err instanceof GitNotFoundError) {
          showError(err.message);
        } else {
          showError(err.message);
        }
        process.exit(1);
      }

      // 3. Check diff size
      const maxDiffLines = getConfig('maxDiffLines');
      const lineCount = diff.split('\n').length;
      if (lineCount > maxDiffLines) {
        showError(`Diff too large (${lineCount} lines). Max is ${maxDiffLines}. Stage fewer files at once.`);
        process.exit(1);
      }

      // 4. Generate suggestion (loop for regenerate)
      const model = options.model || getConfig('model');
      const language = options.lang || getConfig('language');

      let suggestion = null;

      while (true) {
        const aiSpinner = createSpinner('Generating commit message...');
        aiSpinner.start();

        try {
          suggestion = await generateCommitMessage(diff, files, {
            apiKey,
            model,
            language,
          });
          aiSpinner.succeed('Suggestion ready.');
        } catch (err) {
          aiSpinner.fail('AI generation failed.');
          if (err instanceof APIKeyMissingError) {
            showError(err.message);
          } else if (err instanceof APIResponseError) {
            showError(err.message);
          } else {
            showError(err.message);
          }
          process.exit(1);
        }

        // 5. Show suggestion
        showSuggestion(suggestion);

        // 6. Dry run — just print, don't commit
        if (options.dryRun) {
          showWarning('Dry run mode — no commit was made.');
          process.exit(0);
        }

        // 7. Prompt user
        const { action, message } = await promptUserAction(suggestion);

        if (action === 'accept') {
          await runCommit(message, options.noVerify);
          showSuccess(`Committed: ${message}`);
          break;
        } else if (action === 'regenerate') {
          showWarning('Regenerating...');
          continue;
        } else if (action === 'cancel') {
          showWarning('Cancelled. No commit was made.');
          break;
        }
      }
    } catch (err) {
      showError(`Unexpected error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── Config subcommand ────────────────────────────────────────────────────────
program
  .command('config')
  .description('manage gcommit configuration')
  .option('--set <key=value>', 'set a config value e.g. --set apiKey=YOUR_KEY')
  .option('--show', 'show current config')
  .action((options) => {
    try {
      // Handle: gcommit config --set apiKey=VALUE
      if (options.set) {
        const eqIndex = options.set.indexOf('=');
        if (eqIndex === -1) {
          showError('Usage: gcommit config --set key=value  (e.g. --set apiKey=YOUR_KEY)');
          process.exit(1);
        }

        const key = options.set.slice(0, eqIndex).trim();
        const value = options.set.slice(eqIndex + 1).trim();

        if (!value) {
          showError(`No value provided. Usage: gcommit config --set ${key}=YOUR_VALUE`);
          process.exit(1);
        }

        setConfig(key, value);
        showSuccess(`Config updated: ${key} = ${key === 'apiKey' ? value.slice(0, 6) + '••••••' : value}`);
        return;
      }

      // Handle: gcommit config --show
      if (options.show) {
        const config = getAllConfig();
        console.log('');
        console.log('  Current gcommit config:');
        console.log('');
        for (const [key, val] of Object.entries(config)) {
          const display = key === 'apiKey' && val
            ? val.slice(0, 6) + '••••••'
            : val;
          console.log(`    ${key.padEnd(16)} ${display}`);
        }
        console.log('');
        return;
      }

      // No flags passed
      showWarning("Usage: gcommit config --set <key> <value>  or  gcommit config --show");
    } catch (err) {
      showError(err.message);
      process.exit(1);
    }
  });

program.parse();


// ─── Review subcommand ────────────────────────────────────────────────────────
program
  .command('review')
  .description('AI code review of staged changes before committing')
  .option('--commit', 'proceed to commit after review')
  .action(async (options) => {
    try {
      // 1. Resolve API key
      const apiKey = resolveApiKey();
      if (!apiKey) {
        showError("API key missing. Run 'gcommit config --set apiKey=YOUR_KEY'");
        process.exit(1);
      }

      // 2. Get staged diff
      const spinner = createSpinner('Reading staged changes...');
      spinner.start();

      let diff, files;
      try {
        diff = await getStagedDiff();
        files = await getStagedFiles();
        spinner.succeed('Staged changes found.');
      } catch (err) {
        spinner.fail('Failed to read git diff.');
        showError(err.message);
        process.exit(1);
      }

      // 3. Run AI review
      const reviewSpinner = createSpinner('Reviewing your code...');
      reviewSpinner.start();

      let review;
      try {
        const model = getConfig('model');
        review = await reviewStagedChanges(diff, files, { apiKey, model });
        reviewSpinner.succeed('Review complete.');
      } catch (err) {
        reviewSpinner.fail('Review failed.');
        showError(err.message);
        process.exit(1);
      }

      // 4. Show review
      showReview(review);

      // 5. Ask if they want to proceed to commit
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed to generate commit message?',
          default: review.issues.length === 0,
        },
      ]);

      if (!proceed) {
        showWarning('Commit cancelled. Fix the issues and try again.');
        process.exit(0);
      }

      // 6. Generate commit message
      const aiSpinner = createSpinner('Generating commit message...');
      aiSpinner.start();

      const model = getConfig('model');
      const language = getConfig('language');
      let suggestion;

      try {
        suggestion = await generateCommitMessage(diff, files, { apiKey, model, language });
        aiSpinner.succeed('Suggestion ready.');
      } catch (err) {
        aiSpinner.fail('AI generation failed.');
        showError(err.message);
        process.exit(1);
      }

      showSuggestion(suggestion);

      // 7. Interactive commit flow
      while (true) {
        const { action, message } = await promptUserAction(suggestion);

        if (action === 'accept') {
          await runCommit(message);
          showSuccess(`Committed: ${message}`);
          break;
        } else if (action === 'regenerate') {
          showWarning('Regenerating...');
          suggestion = await generateCommitMessage(diff, files, { apiKey, model, language });
          showSuggestion(suggestion);
          continue;
        } else if (action === 'cancel') {
          showWarning('Cancelled. No commit was made.');
          break;
        }
      }

    } catch (err) {
      showError(`Unexpected error: ${err.message}`);
      process.exit(1);
    }
  });