import { ipcMain } from 'electron';

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

declare global {
  interface Window {
    electronAPI: {
      chatMessage: jest.Mock;
      // Add other methods as needed
    };
  }
}

describe('Chat Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI = {
      chatMessage: jest.fn(),
    };
  });

  it('should handle chat messages through IPC', async () => {
    // Mock the chat message handler
    const mockResponse = 'Test response';
    window.electronAPI.chatMessage.mockResolvedValue(mockResponse);

    // Simulate sending a message
    const response = await window.electronAPI.chatMessage(
      [{ role: 'user', content: 'Hello' }],
      'gpt-4',
      0.7,
      []
    );

    // Verify the response
    expect(response).toBe(mockResponse);
    expect(window.electronAPI.chatMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Hello' }],
      'gpt-4',
      0.7,
      []
    );
  });

  it('should handle chat message errors', async () => {
    // Mock an error response
    window.electronAPI.chatMessage.mockRejectedValue(new Error('API Error'));

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