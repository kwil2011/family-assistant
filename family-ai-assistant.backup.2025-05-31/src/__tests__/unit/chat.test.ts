import { ipcRenderer } from 'electron';

// Mock the chat message function
jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

describe('Chat Functionality', () => {
  let mockChatMessage: jest.Mock;

  beforeEach(() => {
    // Set up the mock
    mockChatMessage = jest.fn();
    (window as any).electronAPI = {
      chatMessage: mockChatMessage
    };
  });

  it('should send a chat message and receive a response', async () => {
    // Mock the response
    mockChatMessage.mockResolvedValue('Test response');

    // Call the chat message function
    const response = await window.electronAPI.chatMessage(
      [{ role: 'user', content: 'Hello' }],
      'gpt-4',
      0.7,
      []
    );

    // Verify the response
    expect(response).toBe('Test response');
    expect(mockChatMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Hello' }],
      'gpt-4',
      0.7,
      []
    );
  });

  it('should handle errors gracefully', async () => {
    // Mock an error response
    mockChatMessage.mockRejectedValue(new Error('API Error'));

    // Verify that the error is handled
    await expect(
      window.electronAPI.chatMessage(
        [{ role: 'user', content: 'Hello' }],
        'gpt-4',
        0.7,
        []
      )
    ).rejects.toThrow('API Error');
  });
}); 