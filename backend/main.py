from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import whisper
import tempfile
import os
import httpx
import subprocess
import json

# Create FastAPI app instance
app = FastAPI(title="Bestie Voice Agent API")

# Global variables to store models
whisper_model = None
piper_model_path = None

# Load models on startup
@app.on_event("startup")
async def load_models():
    global whisper_model, piper_model_path
    
    print("Loading Whisper model...")
    whisper_model = whisper.load_model("base")
    print("Whisper model loaded successfully!")
    
    print("Setting up Piper TTS...")
    # Store path to voice model
    piper_model_path = os.path.join(os.path.dirname(__file__), "voices", "en_US-amy-medium.onnx")
    if os.path.exists(piper_model_path):
        print(f"Piper TTS voice model found: {piper_model_path}")
    else:
        print(f"Warning: Piper model not found at {piper_model_path}")

# Configure CORS to allow frontend to communicate with backend
# WARNING: allow_origins=["*"] is insecure for production!
# For production, replace with specific origins: allow_origins=["https://yourdomain.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins - ONLY for local development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Function to generate TTS audio
def generate_tts(text: str, output_path: str):
    """
    Generate speech from text using Piper TTS command line (fully local).
    """
    # Use piper command line tool with proper argument passing to prevent injection
    # length_scale < 1.0 = faster, > 1.0 = slower (default is 1.0)
    speed = 0.85  # 15% faster - adjust between 0.5 (very fast) to 1.5 (slow)
    
    try:
        # Use subprocess with list args instead of shell=True to prevent command injection
        process = subprocess.Popen(
            ['piper', '--model', piper_model_path, '--length_scale', str(speed), '--output_file', output_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=text)
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, 'piper', stderr)
            
        print(f"Piper TTS generated audio successfully")
        print(f"Output file size: {os.path.getsize(output_path)} bytes")
    except subprocess.CalledProcessError as e:
        print(f"Piper command failed: {e.stderr}")
        raise

# Function to call Ollama LLM
async def get_llm_response(user_text: str) -> str:
    """
    Send user text to Ollama and get LLM response.
    """
    ollama_url = "http://localhost:11434/api/generate"
    
    # Create a conversational prompt
    system_prompt = """You are a helpful, friendly voice assistant. Keep your responses:
- Concise and to the point (2-3 sentences max)
- Conversational and natural, like talking to a friend
- Avoid long lists or overly detailed explanations
- Speak in a warm, engaging tone"""
    
    full_prompt = f"{system_prompt}\n\nUser: {user_text}\nAssistant:"
    
    payload = {
        "model": "llama3.2:3b",
        "prompt": full_prompt,
        "stream": False
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(ollama_url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "No response from LLM")
    except Exception as e:
        print(f"Error calling Ollama: {str(e)}")
        return f"Error: Could not get LLM response - {str(e)}"

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Voice Agent API is running"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Audio transcription endpoint
@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts an audio file and returns transcription using Whisper.
    """
    # Validate file type
    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"]
    if file.content_type not in allowed_types:
        return {
            "error": "Invalid file type",
            "received_type": file.content_type,
            "allowed_types": allowed_types
        }
    
    try:
        # Read audio data with size limit (10MB max to prevent DoS)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        audio_data = await file.read()
        
        if len(audio_data) > MAX_FILE_SIZE:
            return {
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB",
                "received": False
            }
        
        # Create a temporary file to save the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(audio_data)
            temp_audio_path = temp_audio.name
        
        # Transcribe using Whisper
        print(f"Transcribing audio file: {temp_audio_path}")
        result = whisper_model.transcribe(temp_audio_path)
        transcription = result["text"]
        
        # Clean up temporary file
        os.remove(temp_audio_path)
        
        print(f"Transcription: {transcription}")
        
        # Get LLM response
        print("Getting LLM response...")
        llm_response = await get_llm_response(transcription)
        print(f"LLM Response: {llm_response}")
        
        # Generate TTS audio (fully local with Piper)
        audio_url = None
        try:
            print("Generating TTS audio with Piper...")
            tts_filename = f"tts_{tempfile.mkstemp()[1].split('/')[-1]}.wav"
            tts_path = os.path.join(tempfile.gettempdir(), tts_filename)
            generate_tts(llm_response, tts_path)
            audio_url = f"/audio/{tts_filename}"
            print(f"TTS audio saved to: {tts_path}")
        except Exception as tts_error:
            print(f"TTS generation failed (continuing without audio): {str(tts_error)}")
        
        return {
            "text": transcription,
            "response": llm_response,
            "audio_url": audio_url,
            "received": True,
            "filename": file.filename,
            "file_size": len(audio_data),
            "content_type": file.content_type
        }
    
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        return {
            "error": f"Error processing audio: {str(e)}",
            "received": False
        }

# Endpoint to serve TTS audio files
@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """
    Serve generated TTS audio files (WAV format from Piper).
    """
    # Prevent path traversal attacks - only allow alphanumeric, underscore, hyphen, and .wav extension
    import re
    if not re.match(r'^tts_[\w-]+\.wav$', filename):
        return {"error": "Invalid filename"}
    
    # Construct safe path
    audio_path = os.path.join(tempfile.gettempdir(), filename)
    
    # Ensure the resolved path is still in temp directory (defense in depth)
    if not os.path.abspath(audio_path).startswith(tempfile.gettempdir()):
        return {"error": "Invalid file path"}
    
    if os.path.exists(audio_path):
        return FileResponse(audio_path, media_type="audio/wav", filename=filename)
    else:
        return {"error": "Audio file not found"}

