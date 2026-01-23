# Contributing

Thank you for your interest in contributing.

> **Note**: This is a solo-maintained project. PRs are welcome but response times may vary. Please be patient.

## Development Setup

See the [README](README.md) for environment setup and running locally.

## Before Submitting

Run verification checks:

```bash
make check      # Linting and type checks
make test-e2e   # End-to-end tests
```

## Code Style

- **Python**: [Ruff](https://docs.astral.sh/ruff/) for linting and formatting
- **TypeScript**: [Biome](https://biomejs.dev/) and [Prettier](https://prettier.io/)

## Commit Conventions

Follow the format in [.gitmessage.txt](.gitmessage.txt):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, chore
```

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
