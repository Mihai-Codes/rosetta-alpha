# Contributing to Rosetta Alpha

Rosetta Alpha was built in 14 days for the Agora Agents Hackathon (Canteen × Circle, May 2026).

## Feedback

If you've used Circle's developer tools (Paymaster, Gateway, x402, CCTP, App Kit) and have friction points or improvement ideas, I'd genuinely love to hear them. Open an issue or reach out.

## Running locally

```bash
uv sync --all-extras
echo "GROQ_API_KEY=your_key" > .env
uv run python -m agents.us_agent --ticker AAPL
```

See [README.md](README.md) for full setup.

## Code style

- Python: ruff (config in pyproject.toml)
- Frontend: TypeScript strict, Tailwind CSS v4
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)

## License

MIT. See [LICENSE](LICENSE).
