// list-gemini-models.js
const fetch = require('node-fetch');

// Replace with your actual Google API key
const API_KEY = 'AIzaSyB8a0eqWvkjlRL4DjexyBzNDTQSsBev1-E';

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    if (data.models && Array.isArray(data.models)) {
      console.log('Available Gemini Models:');
      data.models.forEach(model => {
        console.log(`- ${model.name} (description: ${model.description || 'N/A'})`);
      });
    } else {
      console.log('No models found or invalid response:', data);
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();