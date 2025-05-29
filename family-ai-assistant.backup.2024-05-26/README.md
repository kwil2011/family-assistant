# Family AI Assistant

A desktop-based AI assistant for families with model management capabilities.

## Testing

This project uses Playwright for end-to-end testing. The tests cover the model management functionality including provider and model operations.

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

### Running Tests

1. Run all tests:
```bash
npm test
```

2. Run tests with UI:
```bash
npm run test:ui
```

3. Run tests in debug mode:
```bash
npm run test:debug
```

### Test Structure

The E2E tests are located in `tests/e2e/` and cover:

1. Provider Management
   - Loading provider list
   - Adding new providers
   - Managing API keys

2. Model Management
   - Loading model list
   - Adding new models
   - Editing existing models
   - Toggling model visibility
   - Error handling

### Test Reports

After running tests, you can view the HTML report:
```bash
npx playwright show-report
```

## Development

1. Start the application:
```bash
npm start
```

2. Build the application:
```bash
npm run build
```

## Project Structure

- `main.js` - Main Electron process
- `preload.js` - Preload script for secure IPC
- `renderer/` - Renderer process files
  - `model-management.html` - Model management UI
  - `models.js` - Model configuration
- `tests/e2e/` - End-to-end tests
  - `model-management.test.js` - Model management tests

## Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

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