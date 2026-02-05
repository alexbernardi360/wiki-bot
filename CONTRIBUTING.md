# Contributing to Wiki-Bot

Thank you for your interest in contributing to Wiki-Bot! This document outlines the guidelines for contributing to this project.

## Code of Conduct

Please be respectful and professional in all interactions within this project.

## How to Contribute

### 1. Branching Strategy

We use **GitHub Flow**. All changes should be made in a feature or bugfix branch and merged into the `main` branch via a Pull Request.

- Branch naming: `feature/your-feature-name` or `fix/your-fix-name`.

### 2. Development Setup

1.  Clone the repository: `git clone https://github.com/alexbernardi360/wiki-bot.git`
2.  Install dependencies: `npm install`
3.  Set up environment variables: Copy `.env.example` to `.env` and fill in the values.
4.  Run in development mode: `npm run dev`

### 3. Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Format: `<type>(<scope>): <description>`

- **feat**: A new feature.
- **fix**: A bug fix.
- **docs**: Documentation updates.
- **style**: Code style changes (whitespace, formatting, etc.).
- **refactor**: Code changes that neither fix a bug nor add a feature.
- **test**: Adding or correcting tests.
- **chore**: Maintenance tasks.

Example: `feat(image-gen): add support for custom fonts`

### 4. Pull Requests

- Use the provided PR template.
- Ensure all tests pass.
- Provide a clear description of the changes.
- Tag relevant issues.

## Reporting Bugs and Suggesting Features

Please use the [GitHub Issue Templates](https://github.com/alexbernardi360/wiki-bot/issues/new/choose) to report bugs or suggest new features.
