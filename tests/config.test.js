import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigError } from '../src/errors.js';

// Must mock conf BEFORE importing config.js
// Conf is a class, so our mock must also be a class
vi.mock('conf', () => {
  const mockStore = {
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    language: 'en',
    maxDiffLines: 500,
    autoStage: false,
  };

  return {
    default: class MockConf {
      get(key) {
        return mockStore[key];
      }
      set(key, value) {
        mockStore[key] = value;
      }
      get store() {
        return mockStore;
      }
    },
  };
});

// Import AFTER the mock is set up
import { getConfig, setConfig, resolveApiKey } from '../src/config.js';

describe('getConfig', () => {
  it('returns the default model when not set', () => {
    expect(getConfig('model')).toBe('claude-sonnet-4-20250514');
  });

  it('returns default maxDiffLines', () => {
    expect(getConfig('maxDiffLines')).toBe(500);
  });
});

describe('setConfig', () => {
  it('throws ConfigError for unknown keys', () => {
    expect(() => setConfig('unknownKey', 'value')).toThrow(ConfigError);
  });
});

describe('resolveApiKey', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('prefers env variable over config file', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key-123';
    expect(resolveApiKey()).toBe('env-key-123');
  });

  it('returns empty string when no key is set anywhere', () => {
    expect(resolveApiKey()).toBe('');
  });
});