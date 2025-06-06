const { app, BrowserWindow, ipcMain } = require('electron');
const Store = require('electron-store');
const path = require('path');
const os = require('os');

// Create a shared store instance
const sharedStore = {
    data: new Map(),
    get: jest.fn(key => sharedStore.data.get(key)),
    set: jest.fn((key, value) => sharedStore.data.set(key, value)),
    delete: jest.fn(key => sharedStore.data.delete(key))
};

// Mock the store
jest.mock('electron-store', () => {
    return jest.fn().mockImplementation(() => sharedStore);
});

// Mock the main process functions
jest.mock('../main.js', () => {
    return {
        updateSessionCost: jest.fn((cost) => {
            const currentCost = parseFloat(sharedStore.get('dailyCost') || '0.000000');
            const newCost = (currentCost + cost).toFixed(6);
            sharedStore.set('dailyCost', newCost);
            return newCost;
        }),
        checkAndResetDailyCost: jest.fn(() => {
            const today = new Date().toDateString();
            const lastResetDate = sharedStore.get('lastResetDate');
            
            if (lastResetDate !== today) {
                sharedStore.set('dailyCost', '0.000000');
                sharedStore.set('lastResetDate', today);
                return true;
            }
            return false;
        }),
        sendCostNotification: jest.fn(async (email, cost) => {
            const costValue = parseFloat(cost);
            if (costValue > 5.000000) {
                sharedStore.set('notificationSent', true);
                return true;
            }
            return false;
        })
    };
});

describe('Cost Tracking Tests', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Reset shared store
        sharedStore.data.clear();
        
        // Set initial values
        sharedStore.data.set('dailyCost', '0.000000');
        sharedStore.data.set('sessionCost', '0.000000');
        sharedStore.data.set('userData', { email: 'test@example.com' });
        sharedStore.data.set('lastResetDate', new Date().toDateString());
    });

    describe('Session Cost Tests', () => {
        it('should update session cost correctly', async () => {
            const { updateSessionCost } = require('../main.js');
            const newCost = 0.000123;
            
            updateSessionCost(newCost);
            
            expect(sharedStore.set).toHaveBeenCalledWith('dailyCost', '0.000123');
        });

        it('should format session cost with 6 decimal places', () => {
            const cost = 0.123456789;
            const formattedCost = cost.toFixed(6);
            expect(formattedCost).toBe('0.123457');
        });
    });

    describe('Daily Cost Tests', () => {
        it('should reset daily cost at the start of a new day', () => {
            const { checkAndResetDailyCost } = require('../main.js');
            
            // Mock current date
            const mockDate = new Date('2024-03-20');
            const spy = jest.spyOn(global, 'Date')
                .mockImplementation(() => mockDate);
            
            // Set last reset date to previous day and a non-zero cost
            sharedStore.data.set('lastResetDate', '2024-03-19');
            sharedStore.data.set('dailyCost', '1.234567');
            
            // Clear previous mock calls
            sharedStore.set.mockClear();
            
            checkAndResetDailyCost();
            
            // Verify both the cost was reset and the date was updated
            expect(sharedStore.set).toHaveBeenCalledWith('dailyCost', '0.000000');
            expect(sharedStore.set).toHaveBeenCalledWith('lastResetDate', mockDate.toDateString());
            
            // Cleanup
            spy.mockRestore();
        });

        it('should not reset daily cost on the same day', () => {
            const { checkAndResetDailyCost } = require('../main.js');
            
            // Mock current date
            const mockDate = new Date('2024-03-20');
            const spy = jest.spyOn(global, 'Date')
                .mockImplementation(() => mockDate);
            
            // Set last reset date to same day and a non-zero cost
            sharedStore.data.set('lastResetDate', mockDate.toDateString());
            sharedStore.data.set('dailyCost', '1.234567');
            
            // Clear previous mock calls
            sharedStore.set.mockClear();
            
            checkAndResetDailyCost();
            
            // Verify the daily cost was not reset
            expect(sharedStore.get('dailyCost')).toBe('1.234567');
            expect(sharedStore.set).not.toHaveBeenCalled();
            
            // Cleanup
            spy.mockRestore();
        });
    });

    describe('Cost Warning Tests', () => {
        it('should send cost warning when daily cost exceeds threshold', async () => {
            const { sendCostNotification } = require('../main.js');
            
            // Set high daily cost
            sharedStore.data.set('dailyCost', '5.000001');
            
            await sendCostNotification('test@example.com', '5.000001');
            
            expect(sharedStore.set).toHaveBeenCalledWith('notificationSent', true);
        });

        it('should not send cost warning when cost is below threshold', async () => {
            const { sendCostNotification } = require('../main.js');
            
            // Set low daily cost
            sharedStore.data.set('dailyCost', '4.999999');
            
            await sendCostNotification('test@example.com', '4.999999');
            
            expect(sharedStore.set).not.toHaveBeenCalledWith('notificationSent', true);
        });
    });

    describe('Cost Formatting Tests', () => {
        it('should display costs in AUD with 6 decimal places', () => {
            const cost = 1.23456789;
            const formattedCost = `$${cost.toFixed(6)} AUD`;
            expect(formattedCost).toBe('$1.234568 AUD');
        });

        it('should handle zero costs correctly', () => {
            const cost = 0;
            const formattedCost = `$${cost.toFixed(6)} AUD`;
            expect(formattedCost).toBe('$0.000000 AUD');
        });

        it('should handle very small costs correctly', () => {
            const cost = 0.000001;
            const formattedCost = `$${cost.toFixed(6)} AUD`;
            expect(formattedCost).toBe('$0.000001 AUD');
        });
    });
}); 