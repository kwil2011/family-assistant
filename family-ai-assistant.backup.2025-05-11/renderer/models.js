// Canonical provider/model data for use in both management and chat modal
// This should be the single source of truth for all model info

export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        features: ['Text, Image, Audio', 'Function calling, vision'],
        price: '$0.0076 AUD / 1K tokens',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        features: ['Text, Image', 'Function calling'],
        price: '$0.0152 AUD / 1K tokens',
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        features: ['Text, Image', 'High accuracy'],
        price: '$0.0456 AUD / 1K tokens',
      },
      {
        id: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision',
        features: ['Text, Image (Vision)', 'Image understanding'],
        price: '$0.0456 AUD / 1K tokens',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        features: ['Text only'],
        price: '$0.0023 AUD / 1K tokens',
      },
      {
        id: 'whisper',
        name: 'Whisper',
        features: ['Audio transcription', 'Speech-to-text'],
        price: '$0.0091 AUD / min',
      },
      {
        id: 'dall-e-3',
        name: 'DALL·E 3',
        features: ['Text to Image', 'Inpainting, outpainting'],
        price: '$0.0400–$0.1200 / image',
      },
      {
        id: 'tts',
        name: 'TTS',
        features: ['Text to Speech', 'Alloy, Nova, Onyx, etc.'],
        price: '$0.0150–$0.0300 / 1K char',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        features: ['Most capable model', 'Text, Image'],
        price: '$0.0150 / 1K tokens',
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        features: ['Balanced performance', 'Text, Image'],
        price: '$0.0030 / 1K tokens',
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        features: ['Fastest, lowest cost', 'Text, Image'],
        price: '$0.00025 / 1K tokens',
      },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        features: ['Text, Image', 'Long context'],
        price: '$0.0025 / 1K tokens',
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        features: ['Text only', 'General purpose'],
        price: '$0.0010 / 1K tokens',
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: [
      {
        id: 'mistral-large',
        name: 'Mistral Large',
        features: ['Text only', 'High performance'],
        price: '$0.0080 / 1K tokens',
      },
      {
        id: 'mistral-medium',
        name: 'Mistral Medium',
        features: ['Text only', 'Balanced performance'],
        price: '$0.0027 / 1K tokens',
      },
      {
        id: 'mistral-small',
        name: 'Mistral Small',
        features: ['Text only', 'Fastest, lowest cost'],
        price: '$0.0010 / 1K tokens',
      },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    models: [
      {
        id: 'command-r-plus',
        name: 'Command R+',
        features: ['Text only', 'RAG optimized'],
        price: '$0.0030 / 1K tokens',
      },
      {
        id: 'command',
        name: 'Command',
        features: ['Text only', 'General purpose'],
        price: '$0.0015 / 1K tokens',
      },
    ],
  },
  {
    id: 'meta',
    name: 'Meta',
    models: [
      {
        id: 'llama-3-70b',
        name: 'Llama 3 70B',
        features: ['Text only', 'Open source'],
        price: '$0.0020 / 1K tokens',
      },
      {
        id: 'llama-3-8b',
        name: 'Llama 3 8B',
        features: ['Text only', 'Lightweight'],
        price: '$0.0005 / 1K tokens',
      },
    ],
  },
]; 