# 🤖 WikiBot

A robust NestJS automation bot designed to fetch, process, and distribute content from Wikipedia (and intended for future Instagram integration).

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

## ✨ Features

- **Wikipedia Integration**: Fetches random pages via Wikipedia REST API.
- **Smart Parsing**: Cleans raw text and handles deep object mapping manually for performance.
- **Bot Etiquette**: Implements a compliant User-Agent policy to respect Wikimedia's rules (`MyBot/v.x (contact) Library/v.x`).
- **Secure Configuration**: Uses environment variables for sensitive contact info.

## 🛠️ Tech Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **HTTP Client**: Axios with RxJS
- **Formatting**: Prettier / ESLint

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/wiki-bot.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Environment: Create a .env file in the root directory:
   ```
   WIKI_CONTACT_EMAIL=your-email@example.com
   ```

### Usage

Start the development server

```bash
npm run start:dev
```

Test the Wikipedia endpoint: `GET http://localhost:3000/wikipedia/random`

## 📄 License

This project is licensed under the MIT License - see the [MIT License](LICENSE) file for details.

## 🐳 Docker (Recommended for production/RPi)

### Deploying to Raspberry Pi (Pre-built image)

The fastest way to deploy the bot on a Raspberry Pi is using the pre-built image from GitHub Container Registry (GHCR):

1. Copy the `docker-compose.yml` file and create a `.env` file on your Raspberry Pi.
2. Pull the latest image and start the container:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

### Local Development or Manual Build

If you prefer to compile the image locally:

1. Uncomment the `build: .` line in your `docker-compose.yml` file.
2. Run the build and start command:
   ```bash
   docker-compose up --build -d
   ```

### 🚀 Continuous Deployment

Every time a new **Release** is published on GitHub, a GitHub Action automatically builds the Docker image for both `amd64` and `arm64` architectures and pushes it to **GitHub Container Registry (GHCR)**.

Image URL: `ghcr.io/alexbernardi360/wiki-bot:latest`

### Persistence

The `docker-compose.yml` defines a volume `sqlite_data` mounted to `/app/data` to persist SQLite database files.
