describe('Store Operations', () => {
  let mockStore: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    (window as any).electronAPI = {
      storeGet: mockStore.get,
      storeSet: mockStore.set,
      storeDelete: mockStore.delete,
    };
  });

  describe('storeGet', () => {
    it('should retrieve a value from store', async () => {
      const mockValue = { name: 'test', value: 123 };
      mockStore.get.mockResolvedValue(mockValue);

      const result = await window.electronAPI.storeGet('testKey');
      
      expect(result).toEqual(mockValue);
      expect(mockStore.get).toHaveBeenCalledWith('testKey');
    });

    it('should handle errors when getting value', async () => {
      mockStore.get.mockRejectedValue(new Error('Store error'));

      await expect(window.electronAPI.storeGet('testKey'))
        .rejects.toThrow('Store error');
    });
  });

  describe('storeSet', () => {
    it('should set a value in store', async () => {
      const testKey = 'testKey';
      const testValue = { name: 'test', value: 123 };
      mockStore.set.mockResolvedValue(undefined);

      await window.electronAPI.storeSet(testKey, testValue);
      
      expect(mockStore.set).toHaveBeenCalledWith(testKey, testValue);
    });

    it('should handle errors when setting value', async () => {
      mockStore.set.mockRejectedValue(new Error('Store error'));

      await expect(window.electronAPI.storeSet('testKey', 'value'))
        .rejects.toThrow('Store error');
    });
  });

  describe('storeDelete', () => {
    it('should delete a value from store', async () => {
      mockStore.delete.mockResolvedValue(undefined);

      await window.electronAPI.storeDelete('testKey');
      
      expect(mockStore.delete).toHaveBeenCalledWith('testKey');
    });

    it('should handle errors when deleting value', async () => {
      mockStore.delete.mockRejectedValue(new Error('Store error'));

      await expect(window.electronAPI.storeDelete('testKey'))
        .rejects.toThrow('Store error');
    });
  });
}); 