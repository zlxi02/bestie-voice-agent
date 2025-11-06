from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app instance
app = FastAPI(title="Bestie Voice Agent API")

# Configure CORS to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

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
    Accepts an audio file and returns transcription.
    Currently returns mock data - will integrate Whisper next.
    """
    # Validate file type
    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"]
    if file.content_type not in allowed_types:
        return {
            "error": "Invalid file type",
            "received_type": file.content_type,
            "allowed_types": allowed_types
        }
    
    # Read file content (to verify we received it)
    audio_data = await file.read()
    file_size = len(audio_data)
    
    # Mock response for now
    return {
        "text": "This is a mock transcription. Whisper not integrated yet.",
        "received": True,
        "filename": file.filename,
        "file_size": file_size,
        "content_type": file.content_type
    }

