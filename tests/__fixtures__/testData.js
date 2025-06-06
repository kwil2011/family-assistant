// Test data for various test scenarios
const testData = {
  // User data
  users: {
    admin: {
      email: 'admin@example.com',
      role: 'admin',
      preferences: {
        defaultModel: 'gpt-4-turbo',
        theme: 'dark'
      }
    },
    family: {
      email: 'family@example.com',
      role: 'user',
      preferences: {
        defaultModel: 'gpt-3.5-turbo',
        theme: 'light'
      }
    }
  },

  // Chat messages
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: '2024-03-10T10:00:00Z'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'I am doing well, thank you for asking!',
      timestamp: '2024-03-10T10:00:05Z'
    }
  ],

  // Family settings
  familySettings: {
    members: ['Mom', 'Dad', 'Sarah', 'Tommy'],
    interests: ['hiking', 'board games', 'cooking', 'reading'],
    contentFilter: 'moderate'
  },

  // Document samples
  documents: {
    pdf: {
      name: 'sample.pdf',
      type: 'application/pdf',
      size: 1024
    },
    docx: {
      name: 'sample.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 2048
    }
  },

  // API responses
  apiResponses: {
    success: {
      status: 200,
      data: { message: 'Success' }
    },
    error: {
      status: 400,
      error: 'Bad Request'
    }
  }
};

module.exports = testData; 