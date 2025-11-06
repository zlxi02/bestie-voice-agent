from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import httpx

# Create FastAPI app instance
app = FastAPI(title="Bestie Voice Agent API")

# Global variable to store Whisper model
whisper_model = None

# Load Whisper model on startup
@app.on_event("startup")
async def load_models():
    global whisper_model
    print("Loading Whisper model...")
    whisper_model = whisper.load_model("base")
    print("Whisper model loaded successfully!")

# Configure CORS to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Function to call Ollama LLM
async def get_llm_response(user_text: str) -> str:
    """
    Send user text to Ollama and get LLM response.
    """
    ollama_url = "http://localhost:11434/api/generate"
    
    payload = {
        "model": "llama3.2:3b",
        "prompt": user_text,
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
        # Read audio data
        audio_data = await file.read()
        
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
        
        return {
            "text": transcription,
            "response": llm_response,
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

