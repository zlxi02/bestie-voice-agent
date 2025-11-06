import { useState, useRef } from 'react';
import './App.css';

function App() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [statusText, setStatusText] = useState('Press the microphone to start');
  
  // Refs for media recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Handle microphone button click
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setShowControls(true);
      setStatusText('Recording stopped. Send or cancel?');
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setShowControls(true);
        setStatusText('Recording... Click again to stop or use controls below');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setStatusText('Error: Could not access microphone. Please grant permission.');
      }
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setShowControls(false);
    setStatusText('Recording cancelled. Press the microphone to start');
  };

  // Handle send button
  const handleSend = async () => {
    if (audioChunksRef.current.length === 0) {
      setStatusText('No audio recorded');
      return;
    }

    setIsProcessing(true);
    setShowControls(false);
    setStatusText('Processing your voice...');

    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      // Send to backend
      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.error) {
        setStatusText(`Error: ${data.error}`);
      } else {
        setStatusText(`Transcription: ${data.text}`);
      }
    } catch (error) {
      console.error('Error sending audio:', error);
      setStatusText('Error: Could not connect to server. Make sure backend is running.');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  // Dynamic button class based on state
  const micButtonClass = `mic-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`;

  return (
    <div className="container">
      {/* Main microphone button */}
      <button 
        className={micButtonClass}
        onClick={handleMicClick}
        disabled={isProcessing}
        aria-label="Press to record"
      >
        <svg className="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </button>

      {/* Control buttons (X and Send) */}
      {showControls && !isProcessing && (
        <div className="control-buttons">
          <button className="control-btn cancel-btn" onClick={handleCancel} aria-label="Cancel recording">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button className="control-btn send-btn" onClick={handleSend} aria-label="Send recording">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      )}

      {/* Status area */}
      <div className="status-area">
        <p className="status-text">{statusText}</p>
      </div>
    </div>
  );
}

export default App;
