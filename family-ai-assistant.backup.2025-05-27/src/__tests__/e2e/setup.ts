// Helper function to wait for API responses
export const waitForResponse = async (window, urlPattern) => {
  return window.waitForResponse(response => response.url().includes(urlPattern));
};

// Helper function to check if element exists
export const elementExists = async (window, selector) => {
  try {
    await window.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}; 