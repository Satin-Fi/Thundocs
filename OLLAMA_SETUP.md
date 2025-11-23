# Ollama Setup Guide for AI PDF Chat

This guide will help you set up Ollama to power the AI PDF chat functionality in your application.

## Installation

### 1. Install Ollama

**Windows:**
- Download Ollama from: https://ollama.ai/download
- Run the installer and follow the setup instructions

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama Service

After installation, start the Ollama service:

```bash
ollama serve
```

This will start Ollama on `http://localhost:11434`

### 3. Pull a Language Model

Download a language model (we recommend starting with Llama 2):

```bash
ollama pull llama2
```

Other available models:
- `ollama pull llama2:7b` (smaller, faster)
- `ollama pull llama2:13b` (larger, more capable)
- `ollama pull codellama` (specialized for code)
- `ollama pull mistral` (alternative model)

### 4. Test the Setup

Test if Ollama is working:

```bash
ollama run llama2
```

Type a test message and press Enter. If you get a response, Ollama is working correctly.

## Configuration

The AI chat is configured to use:
- **Base URL:** `http://localhost:11434`
- **Default Model:** `llama2`

To change the model, edit the `AIFullScreenChat.tsx` file and update the model name in the Ollama configuration:

```typescript
const ollama = new Ollama({
  baseUrl: "http://localhost:11434",
  model: "your-preferred-model", // Change this
});
```

## Usage

1. Make sure Ollama is running (`ollama serve`)
2. Open your application and click "Chat with AI"
3. Upload a PDF using the paperclip icon
4. Ask questions about your document!

## Troubleshooting

### "I'm having trouble connecting to the AI model"
- Ensure Ollama is running: `ollama serve`
- Check if the service is accessible: `curl http://localhost:11434`
- Verify you have a model installed: `ollama list`

### Slow responses
- Try a smaller model like `llama2:7b`
- Ensure your system has sufficient RAM (8GB+ recommended)

### Model not found
- Pull the model: `ollama pull llama2`
- Check available models: `ollama list`

## Features

The AI PDF chat now supports:
- ✅ Real PDF text extraction using PDF.js
- ✅ AI-powered document analysis using LangChain.js + Ollama
- ✅ Context-aware responses based on uploaded documents
- ✅ Document summarization and key information extraction
- ✅ Multi-document support
- ✅ Error handling and connection status

Enjoy your AI-powered PDF analysis!