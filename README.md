# gcommit

> AI-powered Git commit message generator. Reads your staged diff and suggests a conventional commit message instantly.

## Demo

$ gcommit
✔ Staged changes found.
✔ Suggestion ready.
Suggestion: feat(auth): add JWT token refresh on expiry
❯ Accept
Edit manually
Regenerate
Cancel

## Installation

**New Users:**
```bash
npm install -g @shankar07/gcommit
```

**Existing Users (Update to latest version):**
```bash
npm update -g @shankar07/gcommit
```

## Setup

Get a free API key from [console.groq.com](https://console.groq.com) and save it:

```bash
gcommit config --set apiKey=YOUR_GROQ_KEY
```

## Usage

```bash
# View all available commands and options
gcommit --help

# Generate a commit message for staged changes
gcommit

# 🔥 NEW: AI code review of staged changes before committing
gcommit review
gcommit review --help  # see specific options for the review command

# Preview suggestion without committing
gcommit --dry-run

# Generate message in a different language
gcommit --lang hi
gcommit --lang fr

# Override the AI model for this run
gcommit --model meta-llama/llama-4-maverick-17b-128e-instruct

# Skip git hooks
gcommit --no-verify
```

## Config

```bash
# Set a value
gcommit config --set key=value

# View all config
gcommit config --show
```

| Key | Default | Description |
|---|---|---|
| `apiKey` | `""` | Groq API key |
| `model` | `meta-llama/llama-4-scout-17b-16e-instruct` | AI model to use |
| `language` | `en` | Language for commit description |
| `maxDiffLines` | `500` | Reject diffs larger than this |
| `autoStage` | `false` | Auto stage all files before diff |

Config is stored at `~/.config/gcommit/config.json`.

API key resolution order:
1. `GROQ_API_KEY` environment variable
2. Config file (`gcommit config --set apiKey=...`)

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make changes and run tests: `npm test`
4. Submit a pull request

## License

MIT

## Security & Privacy

Your staged git diff is sent to Groq's API to generate the commit message.
Do not use this tool if your code is confidential or if your diff may contain
secrets (passwords, API keys, tokens). Review Groq's privacy policy at
https://groq.com/privacy-policy before use.