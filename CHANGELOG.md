# Changelog

## [0.2.0] - 2026-04-15

### Added
- `gcommit review` feature for AI code reviews of staged changes before committing
- Dedicated `gcommit review --help` command for code review options
- Interactive transition prompt from review directly into the commit generator

## [0.1.0] - 2026-04-14

### Added
- AI-powered commit message generation using Groq API
- Accept / Edit / Regenerate / Cancel interactive flow
- `--dry-run` flag to preview suggestion without committing
- `--lang` flag to generate messages in any language
- `--no-verify` flag to skip git hooks
- `--model` flag to override AI model per run
- Config system with `gcommit config --set` and `--show`
- API key resolution from env var or config file
- Diff size guard (rejects diffs over `maxDiffLines`)
- Custom error classes for all failure modes
- Full test suite with Vitest