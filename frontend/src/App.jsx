import { useState, useRef } from 'react';
import './App.css';

function App() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [statusText, setStatusText] = useState('Press the microphone to start');
  const [audioLevel, setAudioLevel] = useState(0);
  const [userText, setUserText] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  
  // Refs for media recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Analyze audio levels for visualization
  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0-1
    
    // Amplify the level for better visual effect (with a minimum threshold)
    const amplifiedLevel = Math.min(1, normalizedLevel * 2.5);

    setAudioLevel(amplifiedLevel);
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  // Handle microphone button click
  const handleMicClick = async () => {
    if (isRecording) {
      // Second click: Send the recording
      await handleSend();
    } else {
      // First click: Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Set up Web Audio API for visualization
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Configure analyser for better visual responsiveness
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3; // Less smoothing = more reactive

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start analyzing audio
        analyzeAudio();

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          // This will be handled by handleSend
        };

        mediaRecorder.start();
        setIsRecording(true);
        setShowControls(true);
        setStatusText('Recording... Click microphone again to send');
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

    // Clean up audio context
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setShowControls(false);
    setAudioLevel(0);
    setStatusText('Recording cancelled. Press the microphone to start');
  };

  // Handle send button
  const handleSend = async () => {
    // Stop recording first and wait for it to finish
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Wait for the recorder to stop and collect all data
      await new Promise((resolve) => {
        mediaRecorderRef.current.onstop = () => {
          resolve();
        };
        mediaRecorderRef.current.stop();
      });
    }

    setIsRecording(false);
    setIsProcessing(true);
    setShowControls(false);
    setAudioLevel(0);
    setStatusText('Processing your voice...');

    // Clean up audio context
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    // Check if we have audio data
    if (audioChunksRef.current.length === 0) {
      setStatusText('No audio recorded');
      setIsProcessing(false);
      return;
    }

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
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
        setUserText('');
        setAgentResponse('');
        setAudioUrl('');
      } else {
        setUserText(data.text);
        setAgentResponse(data.response);
        
        // Set audio URL if available
        if (data.audio_url) {
          const fullAudioUrl = `http://localhost:8000${data.audio_url}`;
          console.log('Audio URL:', fullAudioUrl);
          setAudioUrl(fullAudioUrl);
        } else {
          setAudioUrl('');
          console.log('TTS audio not available - showing text only');
        }
        
        setStatusText('');
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
      {/* Title */}
      <div className="title-section">
        <h1 className="app-title">Bestie</h1>
        <p className="app-subtitle">What's up?</p>
      </div>
      
      {/* Main microphone button with wave visualization */}
      <div className="mic-container">
        {/* Animated wave circles - pulse based on actual audio volume */}
        {isRecording && (
          <>
            <div 
              className="wave-circle" 
              style={{ 
                transform: `scale(${1 + audioLevel * 1.5})`, 
                opacity: Math.max(0.3, audioLevel * 0.8) 
              }}
            />
            <div 
              className="wave-circle" 
              style={{ 
                transform: `scale(${1.2 + audioLevel * 2.0})`, 
                opacity: Math.max(0.2, audioLevel * 0.6) 
              }}
            />
            <div 
              className="wave-circle" 
              style={{ 
                transform: `scale(${1.4 + audioLevel * 2.5})`, 
                opacity: Math.max(0.1, audioLevel * 0.4) 
              }}
            />
          </>
        )}
        
        <button 
          className={micButtonClass}
          onClick={handleMicClick}
          disabled={isProcessing}
          aria-label={isRecording ? "Click to send" : "Press to record"}
        >
          {isRecording ? (
            // Send icon (paper airplane)
            <svg className="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          ) : (
            // Microphone icon
            <svg className="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </button>
      </div>

      {/* Cancel button (centered) */}
      {showControls && !isProcessing && (
        <button className="control-btn cancel-btn" onClick={handleCancel} aria-label="Cancel recording">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Status/Conversation area */}
      <div className="status-area">
        {statusText && <p className="status-text">{statusText}</p>}
        
        {userText && (
          <div className="conversation">
            <div className="message user-message">
              <strong>You:</strong> {userText}
            </div>
            {agentResponse && (
              <div className="message agent-message">
                <strong>Bestie:</strong> {agentResponse}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden audio player for TTS */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          autoPlay
          style={{ display: 'none' }}
          onError={(e) => console.error('Audio element error:', e)}
          onLoadedData={() => console.log('Audio loaded successfully')}
        />
      )}
    </div>
  );
}

export default App;
