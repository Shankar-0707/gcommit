import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '../src/prompt.js';

describe('buildSystemPrompt', () => {
  it('contains the conventional commits format instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Conventional Commits');
  });

  it('contains all valid commit types', () => {
    const prompt = buildSystemPrompt();
    const types = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'style', 'perf', 'ci'];
    for (const type of types) {
      expect(prompt).toContain(type);
    }
  });

  it('instructs English when language is en', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('English');
  });

  it('instructs a different language when lang is not en', () => {
    const prompt = buildSystemPrompt('fr');
    expect(prompt).toContain('"fr"');
    expect(prompt).not.toContain('Write the commit description in English');
  });
});

describe('buildUserPrompt', () => {
  it('contains the diff in the output', () => {
    const prompt = buildUserPrompt('diff --git a/foo.js', ['foo.js']);
    expect(prompt).toContain('diff --git a/foo.js');
  });

  it('contains the filenames in the output', () => {
    const prompt = buildUserPrompt('some diff', ['src/auth.js', 'src/config.js']);
    expect(prompt).toContain('src/auth.js');
    expect(prompt).toContain('src/config.js');
  });

  it('handles empty file list gracefully', () => {
    const prompt = buildUserPrompt('some diff', []);
    expect(prompt).toContain('unknown');
  });
});