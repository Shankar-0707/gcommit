import Conf from "conf";
import { ConfigError } from './errors.js';

/**
 * Default configuration values.
 * These are used when the user hasn't set anything yet.
 */
const DEFAULTS = {
    apiKey: '',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    language: 'en',
    maxDiffLines: 2000,
    autoStage: false,
};

/**
 * The conf instance. Automatically stores config at
 * ~/.config/gcommit/config.json on all platforms.
 */
const store = new Conf({
    projectName: 'gcommit',
    defaults: DEFAULTS,
});

/**
 * Get a config value by key.
 * Returns the default if the key has never been set.
 *
 * @param {string} key - config key (e.g. 'apiKey', 'model')
 * @returns {unknown} the stored value or default
 */
export function getConfig(key) {
    try {
        return store.get(key);
    } catch (error) {
        throw new ConfigError(`Failed to read config key "${key}": ${error.message}`);
    }
}

/**
 * Set a config value by key.
 *
 * @param {string} key - config key
 * @param {unknown} value - value to store
 * @returns {void}
 */
export function setConfig(key, value) {
    if(!(key in DEFAULTS)) {
        throw new ConfigError(`Unknown config key "${key}". Valid keys are: ${Object.keys(DEFAULTS).join(', ')}`);
    }
    try {
        store.set(key, value);
    } catch (error) {
        throw new ConfigError(`Failed to write config key "${key}": ${error.message}`);
    }
}

/**
 * Get the full config object (all keys and their current values).
 *
 * @returns {object} full config
 */
export function getAllConfig() {
  try {
    return store.store;
  } catch (err) {
    throw new ConfigError(`Failed to read config: ${err.message}`);
  }
}

/**
 * Resolve the API key using priority order:
 * 1. ANTHROPIC_API_KEY environment variable
 * 2. apiKey stored in config file
 *
 * CLI flag override is handled in index.js before calling this.
 *
 * @returns {string} the resolved API key
 */
export function resolveApiKey() {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.trim() !== '') {
    return envKey.trim();
  }

   const configKey = getConfig('apiKey');
  if (configKey && configKey.trim() !== '') {
    return configKey.trim();
  }

    return '';
}