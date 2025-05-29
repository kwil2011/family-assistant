describe('Media Operations', () => {
  let mockMediaOps: {
    analyzeImage: jest.Mock;
    createImage: jest.Mock;
    transcribeAudio: jest.Mock;
    textToSpeech: jest.Mock;
    takeScreenshot: jest.Mock;
  };

  beforeEach(() => {
    mockMediaOps = {
      analyzeImage: jest.fn(),
      createImage: jest.fn(),
      transcribeAudio: jest.fn(),
      textToSpeech: jest.fn(),
      takeScreenshot: jest.fn(),
    };

    (window as any).electronAPI = {
      analyzeImage: mockMediaOps.analyzeImage,
      createImage: mockMediaOps.createImage,
      transcribeAudio: mockMediaOps.transcribeAudio,
      textToSpeech: mockMediaOps.textToSpeech,
      takeScreenshot: mockMediaOps.takeScreenshot,
    };
  });

  describe('analyzeImage', () => {
    it('should analyze an image successfully', async () => {
      const mockFileName = 'test.jpg';
      const mockFileData = new Uint8Array([1, 2, 3, 4]);
      const mockPrompt = 'Describe this image';
      const mockResponse = 'Image description';

      mockMediaOps.analyzeImage.mockResolvedValue(mockResponse);

      const result = await window.electronAPI.analyzeImage(
        mockFileName,
        mockFileData,
        mockPrompt
      );

      expect(result).toBe(mockResponse);
      expect(mockMediaOps.analyzeImage).toHaveBeenCalledWith(
        mockFileName,
        mockFileData,
        mockPrompt
      );
    });
  });

  describe('createImage', () => {
    it('should create an image from prompt', async () => {
      const mockPrompt = 'Create a sunset image';
      const mockImageUrl = 'http://example.com/image.jpg';

      mockMediaOps.createImage.mockResolvedValue(mockImageUrl);

      const result = await window.electronAPI.createImage(mockPrompt);

      expect(result).toBe(mockImageUrl);
      expect(mockMediaOps.createImage).toHaveBeenCalledWith(mockPrompt);
    });
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio successfully', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      const mockTranscription = 'Hello, world!';

      mockMediaOps.transcribeAudio.mockResolvedValue(mockTranscription);

      const result = await window.electronAPI.transcribeAudio(mockAudioData);

      expect(result).toBe(mockTranscription);
      expect(mockMediaOps.transcribeAudio).toHaveBeenCalledWith(mockAudioData);
    });
  });

  describe('textToSpeech', () => {
    it('should convert text to speech', async () => {
      const mockText = 'Hello, world!';
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);

      mockMediaOps.textToSpeech.mockResolvedValue(mockAudioData);

      const result = await window.electronAPI.textToSpeech(mockText);

      expect(result).toEqual(mockAudioData);
      expect(mockMediaOps.textToSpeech).toHaveBeenCalledWith(mockText);
    });
  });

  describe('takeScreenshot', () => {
    it('should capture a screenshot', async () => {
      const mockScreenshotData = 'data:image/png;base64,abc123';

      mockMediaOps.takeScreenshot.mockResolvedValue(mockScreenshotData);

      const result = await window.electronAPI.takeScreenshot();

      expect(result).toBe(mockScreenshotData);
      expect(mockMediaOps.takeScreenshot).toHaveBeenCalled();
    });
  });
}); 