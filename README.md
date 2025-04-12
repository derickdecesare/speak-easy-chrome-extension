# Speak Easy

A Chrome extension that uses the Eleven Labs API to pronounce highlighted text on web pages.

## Features

- Highlight text on any webpage and hear its pronunciation
- Uses Eleven Labs text-to-speech API for natural voice synthesis
- Multiple voice options including Spanish and multilingual support
- Configurable model selection for different quality/speed tradeoffs
- Simple configuration with your Eleven Labs API key

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/derickdecesare/speak-easy-chrome-extension.git
   cd speak-easy-chrome-extension
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the extension:

   ```
   npm run build
   ```

   For development with auto-rebuild:

   ```
   npm run dev
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked" and select the `dist` folder from this project

## Configuration

1. Click on the Speak Easy icon in your browser toolbar
2. Enter your Eleven Labs API key
3. Select your preferred voice and model
4. Click Save

You can get an API key from [Eleven Labs](https://elevenlabs.io/)

## Usage

1. Highlight any text on a webpage
2. Right-click and select "Speak with 11labs" from the context menu
3. Listen to the pronunciation of the highlighted text

## Available Voices

- Sofi (Spanish)
- Valeria
- David Martin
- Shau

## Available Models

- Flash (Faster)
- Multilingual (Higher Quality)
- Turbo

## Requirements

- Chrome browser
- Eleven Labs API key

## Build Command

rm -rf dist && npm run build

## License

MIT
