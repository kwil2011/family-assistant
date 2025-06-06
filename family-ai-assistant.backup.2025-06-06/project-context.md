# Family AI Assistant - Project Context

## Tech Stack

### Frontend
- **Framework**: Electron (Desktop Application)
- **UI**: HTML/CSS/JavaScript
- **Build Tools**: Vite
- **Testing**: 
  - Jest (Unit/Integration)
  - Playwright (E2E)

### Backend
- **Runtime**: Node.js
- **Storage**: 
  - electron-store (Local storage)
  - Firebase (User data)
- **AI Integration**:
  - OpenAI API
  - Google Generative AI (Gemini)
  - Anthropic (Claude)

### Development Tools
- TypeScript
- Babel
- ESLint
- Docker support

## Project Structure

```
family-ai-assistant/
├── main.js                 # Main Electron process
├── preload.js             # Preload scripts for secure IPC
├── renderer/              # Frontend application
│   ├── index.html        # Main application window
│   ├── dashboard.html    # User dashboard
│   ├── chat.html         # AI chat interface
│   ├── personalization.html # User preferences
│   ├── model-management.html # AI model configuration
│   └── styles.css        # Global styles
├── tests/                # Test suites
├── shared-data/          # Network share storage
└── assets/              # Static assets
```

## Core Features

1. **AI Chat Interface**
   - Multi-model support (OpenAI, Gemini, Claude)
   - Customizable AI personas
   - Chat history management
   - Cost tracking and usage monitoring

2. **User Management**
   - User registration and authentication
   - Admin controls
   - Password recovery
   - User preferences

3. **Model Management**
   - Multiple AI model support
   - Model switching
   - Cost optimization
   - Usage tracking

4. **Personalization**
   - Custom AI personas
   - Response length preferences
   - Content filtering
   - Family-specific settings

5. **Document Analysis**
   - PDF processing
   - Word document support
   - Excel file handling
   - Text extraction

## API Integration

### AI Providers
- OpenAI API (GPT models)
- Google Generative AI (Gemini models)
- Anthropic (Claude models)

### External Services
- Google Search API (SERP)
- Exchange rate API
- Firebase Authentication

## Data Management

### Storage
- Local storage via electron-store
- Network share support for multi-user
- Firebase for user data
- Encrypted configuration storage

### State Management
- Electron IPC for main-renderer communication
- Local storage for user preferences
- Session management via Firebase

## Security Features

- Context isolation
- Preload script security
- Encrypted storage
- Secure API key management
- CSP implementation

## Testing Strategy

1. **Unit Tests**
   - Jest for component testing
   - Mocked Electron APIs
   - Isolated function testing

2. **Integration Tests**
   - Component interaction testing
   - API integration testing
   - State management testing

3. **E2E Tests**
   - Playwright for UI testing
   - User flow validation
   - Cross-platform testing

## Known Limitations

1. **Performance**
   - Large document processing may be slow
   - Multiple AI model loading can be resource-intensive

2. **Security**
   - Local storage encryption key management
   - API key storage security

3. **Features**
   - Limited offline functionality
   - Basic error handling
   - Limited multi-language support

## TODOs

1. **Enhancements**
   - Implement real-time collaboration
   - Add more AI model providers
   - Improve offline capabilities
   - Add multi-language support

2. **Security**
   - Implement stronger encryption
   - Add 2FA support
   - Enhance API key management

3. **Performance**
   - Optimize document processing
   - Implement caching
   - Add background processing

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev        # Start development server
   npm run test:unit  # Run unit tests
   npm run test:e2e   # Run E2E tests
   ```

2. **Building**
   ```bash
   npm run build:win  # Build Windows executable
   ```

3. **Testing**
   ```bash
   npm run test:all   # Run all tests
   npm run test:coverage # Generate coverage report
   ``` 