// Mock the window object
global.window = {
    electronAPI: {
        storeGet: jest.fn(),
        storeSet: jest.fn(),
        getPersonas: jest.fn()
    },
    location: {
        replace: jest.fn(),
        href: ''
    }
};

// Mock document
global.document = {
    getElementById: jest.fn(),
    addEventListener: jest.fn(),
    body: {
        innerHTML: ''
    }
};

// Mock console
global.console = {
    log: jest.fn(),
    error: jest.fn()
}; 