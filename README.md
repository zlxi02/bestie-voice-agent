# Bestie Voice Agent 🎤

A fully local voice assistant. Record your voice, get an AI response, and hear it speak back. Everything runs on your machine.

![](https://img.shields.io/badge/Privacy-100%25%20Local-green)
![](https://img.shields.io/badge/Python-3.9+-blue)
![](https://img.shields.io/badge/License-MIT-yellow)

## What It Does

Talk to an AI assistant using your voice. The app transcribes your speech, processes it with an LLM, and responds with synthesized voice. All processing is local—no cloud services, no data leaving your computer.

## Voice Architecture

### Pipeline Overview

```
Your Voice → STT → LLM → TTS → AI Voice Response
```

### Detailed Flow

**1. Audio Capture (Frontend)**
- Browser's MediaRecorder API captures microphone input
- Web Audio API analyzes frequency data for real-time visualization
- Audio encoded as WebM and sent to backend

**2. Speech-to-Text (Backend - Whisper)**
- OpenAI's Whisper model transcribes audio to text
- Model: `base` (140MB) - good balance of speed and accuracy
- Processing: 1-3 seconds on modern CPU
- Output: Transcribed text string

**3. Language Model (Backend - Ollama)**
- Llama 3.2 (3B parameters) processes transcription
- System prompt ensures concise, conversational responses
- Processing: 2-10 seconds depending on response length
- Output: Text response

**4. Text-to-Speech (Backend - Piper)**
- Piper neural TTS synthesizes response to audio
- Voice: `en_US-amy-medium` (60MB model)
- Speed: 0.85x (15% faster than default)
- Processing: 1-2 seconds
- Output: WAV file

**5. Audio Playback (Frontend)**
- Browser auto-plays synthesized audio
- Hidden audio element handles playback

### Why This Stack?

- **Whisper**: Industry-leading accuracy, works offline
- **Ollama**: Easiest way to run local LLMs, simple API
- **Piper**: Best quality open-source TTS, neural voices
- **FastAPI**: Fast async Python framework, clean API design

## Tech Stack

**Frontend:**
- React + Vite
- Web Audio API for visualization
- MediaRecorder API for voice capture

**Backend:**
- FastAPI (Python)
- Whisper (Speech-to-Text)
- Ollama (LLM)
- Piper TTS (Text-to-Speech)

## Quick Start

### Prerequisites

Install these first:
- Python 3.9+
- Node.js 16+
- FFmpeg: `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux)
- Ollama: Download from [ollama.com](https://ollama.com/download)

### Installation

**1. Clone and setup backend:**
```bash
git clone https://github.com/yourusername/bestie-voice-agent.git
cd bestie-voice-agent/backend

python3 -m venv bestie-agent
source bestie-agent/bin/activate
pip install -r requirements.txt

# Download Piper voice model (60MB)
mkdir -p voices && cd voices
curl -L -o en_US-amy-medium.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx"
curl -L -o en_US-amy-medium.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json"
cd ..
```

**2. Install Ollama model:**
```bash
ollama pull llama3.2:3b  # 2GB download
```

**3. Setup frontend:**
```bash
cd ../frontend
npm install
```

### Running

Open three terminals:

**Terminal 1 - Backend:**
```bash
cd backend
source bestie-agent/bin/activate
uvicorn main:app --reload
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - Ollama:**
```bash
ollama serve
```

Open `http://localhost:5173` and start talking.

## How to Use

1. Click the microphone button
2. Speak your question (button turns green, waves pulse with your voice)
3. Click the green paper airplane to send
4. Wait 5-15 seconds for processing
5. Hear the AI response

## Security

**Built for local use.** All processing happens on your machine. No data leaves your computer.

**Security features:**
- Command injection protection
- Path traversal prevention  
- File size limits (10MB max)
- Input validation

**For public deployment:** See `SECURITY.md` for production hardening checklist (CORS, auth, rate limiting, HTTPS).

## Project Structure

```
bestie-voice-agent/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── voices/              # Piper TTS voice models (gitignored)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── App.css         # Styles
│   │   └── main.jsx        # React entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Configuration

**Speech speed:** Edit `speed = 0.85` in `backend/main.py` line 51 (0.5 = fast, 1.5 = slow)

**Change voice:** Download different models from [Piper voices](https://huggingface.co/rhasspy/piper-voices), replace files in `backend/voices/`

**LLM behavior:** Edit system prompt in `backend/main.py` lines 75-79

## Troubleshooting

**"Piper command not found"** - Run `which piper` to verify installation

**"Ollama connection refused"** - Start Ollama with `ollama serve`

**Microphone blocked** - Grant browser microphone permission

**No audio plays** - Check browser console. Some browsers block autoplay—click the page first.

## Performance

Expected latency on modern CPU:
- Whisper transcription: 1-3s
- LLM response: 2-10s  
- Piper TTS: 1-2s
- **Total: 4-15 seconds**

With GPU acceleration (NVIDIA): 2-5 seconds total.

## Credits

Built with [Whisper](https://github.com/openai/whisper), [Ollama](https://ollama.com/), [Piper TTS](https://github.com/rhasspy/piper), [FastAPI](https://fastapi.tiangolo.com/), and [React](https://react.dev/).

## License

MIT - Use for any purpose, personal or commercial.

---

**Note:** Personal project. Not affiliated with OpenAI, Meta, or model creators.

