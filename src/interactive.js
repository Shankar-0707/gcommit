import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";

/**
 * Show a styled commit suggestion in the terminal.
 *
 * @param {string} message - the suggested commit message
 * @returns {void}
 */
export function showSuggestion(message) {
    console.log('');
    console.log(chalk.bold('    Suggestion:   ') + chalk.cyan(message));
    console.log('');
}

/**
 * Show a styled error message in the terminal.
 *
 * @param {string} message - the error message to display
 * @returns {void}
 */
export function showError(message) {
  console.log('');
  console.error(chalk.red('  ✘ ' + message));
  console.log('');
}

/**
 * Show a styled success message in the terminal.
 *
 * @param {string} message - the success message to display
 * @returns {void}
 */
export function showSuccess(message) {
  console.log('');
  console.log(chalk.green('  ✔ ' + message));
  console.log('');
}

/**
 * Show a styled warning message in the terminal.
 *
 * @param {string} message - the warning to display
 * @returns {void}
 */
export function showWarning(message) {
  console.log(chalk.yellow('  ⚠ ' + message));
}

/**
 * Create and return an Ora spinner instance.
 * Call .start() to begin and .succeed()/.fail() to end.
 *
 * @param {string} text - the loading text to show
 * @returns {import('ora').Ora} the spinner instance
 */
export function createSpinner(text) {
  return ora({ text, color: 'cyan' });
}

/**
 * Show the interactive Accept / Edit / Regenerate / Cancel menu.
 * Returns what the user chose and the final message.
 *
 * @param {string} suggestion - the AI suggested commit message
 * @returns {Promise<{ action: string, message: string }>}
 */
export async function promptUserAction(suggestion) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      pageSize: 4,
      choices: [
        { name: '✔  Accept', value: 'accept' },
        { name: '✎  Edit manually', value: 'edit' },
        { name: '↻  Regenerate', value: 'regenerate' },
        { name: '✘  Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'edit') {
    const { edited } = await inquirer.prompt([
      {
        type: 'input',
        name: 'edited',
        message: 'Edit the commit message:',
        default: suggestion,
      },
    ]);
    return { action: 'accept', message: edited.trim() };
  }

  return { action, message: suggestion };
}