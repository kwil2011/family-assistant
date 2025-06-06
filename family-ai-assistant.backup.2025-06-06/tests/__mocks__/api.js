// Mock API responses for testing
const mockResponses = {
  openai: {
    'gpt-3.5-turbo': {
      response: {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a mock response from GPT-3.5 Turbo'
          }
        }]
      }
    },
    'gpt-4-turbo': {
      response: {
        id: 'chatcmpl-456',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4-turbo',
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a mock response from GPT-4 Turbo'
          }
        }]
      }
    }
  },
  google: {
    search: {
      response: {
        items: [
          {
            title: 'Mock Search Result 1',
            link: 'https://example.com/1',
            snippet: 'This is a mock search result'
          }
        ]
      }
    }
  }
};

// Mock API functions
const mockAPI = {
  openai: {
    chat: {
      completions: {
        create: async (params) => {
          const model = params.model;
          return mockResponses.openai[model].response;
        }
      }
    }
  },
  google: {
    search: async (query) => {
      return mockResponses.google.search.response;
    }
  }
};

module.exports = mockAPI; 