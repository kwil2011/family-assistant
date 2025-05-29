describe('Document Operations', () => {
  let mockDocOps: {
    processDocument: jest.Mock;
    getSpellSuggestions: jest.Mock;
  };

  beforeEach(() => {
    mockDocOps = {
      processDocument: jest.fn(),
      getSpellSuggestions: jest.fn(),
    };

    (window as any).electronAPI = {
      processDocument: mockDocOps.processDocument,
      getSpellSuggestions: mockDocOps.getSpellSuggestions,
    };
  });

  describe('processDocument', () => {
    it('should process a document successfully', async () => {
      const mockFileName = 'test.pdf';
      const mockFileData = new Uint8Array([1, 2, 3, 4]);
      const mockPrompt = 'Summarize this document';
      const mockResponse = 'Document summary';

      mockDocOps.processDocument.mockResolvedValue(mockResponse);

      const result = await window.electronAPI.processDocument(
        mockFileName,
        mockFileData,
        mockPrompt
      );

      expect(result).toBe(mockResponse);
      expect(mockDocOps.processDocument).toHaveBeenCalledWith(
        mockFileName,
        mockFileData,
        mockPrompt
      );
    });

    it('should handle document processing errors', async () => {
      mockDocOps.processDocument.mockRejectedValue(new Error('Processing failed'));

      await expect(
        window.electronAPI.processDocument('test.pdf', new Uint8Array(), 'Summarize')
      ).rejects.toThrow('Processing failed');
    });
  });

  describe('getSpellSuggestions', () => {
    it('should return spelling suggestions', async () => {
      const mockWord = 'tset';
      const mockSuggestions = ['test', 'text', 'toast'];

      mockDocOps.getSpellSuggestions.mockResolvedValue(mockSuggestions);

      const result = await window.electronAPI.getSpellSuggestions(mockWord);

      expect(result).toEqual(mockSuggestions);
      expect(mockDocOps.getSpellSuggestions).toHaveBeenCalledWith(mockWord);
    });

    it('should handle spell check errors', async () => {
      mockDocOps.getSpellSuggestions.mockRejectedValue(new Error('Spell check failed'));

      await expect(
        window.electronAPI.getSpellSuggestions('tset')
      ).rejects.toThrow('Spell check failed');
    });
  });
}); 