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

