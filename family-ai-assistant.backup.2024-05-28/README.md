# Family AI Assistant

A desktop-based AI assistant for families using OpenAI API and other AI services.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Git

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/kwil2011/family-assistant.git
cd family-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys
```

Required API Keys:
- OPENAI_API_KEY: Get from [OpenAI Platform](https://platform.openai.com)
- SERPAPI_API_KEY: Get from [SerpAPI](https://serpapi.com)
- GOOGLE_API_KEY: Get from [Google Cloud Console](https://console.cloud.google.com)

4. Build the application:
```bash
# For development
npm run dev

# For production build
npm run build:win
```

The built application will be available in the `dist` directory.

## Development

- `npm run dev`: Start the application in development mode
- `npm run build`: Build the Vite application
- `npm run build:win`: Build the Windows installer
- `npm test`: Run tests
- `npm run test:e2e`: Run end-to-end tests

## Project Structure

- `main.js`: Main Electron process
- `preload.js`: Preload script for Electron
- `renderer/`: Frontend application files
- `src/`: Source code
- `dist/`: Build output directory

## License

ISC 