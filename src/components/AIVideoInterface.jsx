import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton,
  Button,
  useTheme
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

// In a real implementation, this would connect to an AI avatar generation service
// For demonstration purposes, we'll simulate the experience
const AIVideoInterface = ({ isActive, projectContext, onMessageReceived }) => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const userVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const utteranceRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stream, setStream] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1.1); // Faster than default
  const [pitch, setPitch] = useState(1.0);

  // Simulated AI responses based on project context
  const aiResponses = [
    "Hello, I am a business analyst AI agent developed by AI team from UCI India. How can I assist you with your business analysis needs today?Let's get on a call !",
    "I've analyzed your business requirements and generated the initial documents. Would you like me to explain any specific part in more detail?",
    "The competitive analysis shows several key market players. Let me walk you through our findings and recommendations.",
    "I've broken down the project into technical tasks based on your requirements. Each task has estimated hours and required skills.",
    "Based on your team's skill sets, I've assigned tasks optimally. John would be best for the database work as he has the strongest SQL skills.",
    "I've created the Jira tickets and assigned them to your team members. Is there anything else you'd like me to explain?"
  ];

  // Load available voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter for higher quality voices
      const qualityVoices = voices.filter(voice =>
        voice.name.includes('Premium') ||
        voice.name.includes('Enhanced') ||
        voice.name.includes('Neural') ||
        voice.name.includes('Google') ||
        voice.name.includes('Microsoft') ||
        (voice.lang === 'en-US' || voice.lang === 'en-GB')
      );
      setAvailableVoices(qualityVoices.length > 0 ? qualityVoices : voices);
      // Set a default voice, preferring premium/neural voices
      const defaultVoice = qualityVoices.find(voice =>
        voice.name.includes('Premium') ||
        voice.name.includes('Neural') ||
        voice.name.includes('Enhanced')
      );
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.name);
      } else if (qualityVoices.length > 0) {
        setSelectedVoice(qualityVoices[0].name);
      } else if (voices.length > 0) {
        setSelectedVoice(voices[0].name);
      }
    };
    
    // Load voices immediately if available
    loadVoices();
    
    // Chrome loads voices asynchronously, so we need this event listener
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Cleanup
    return () => {
      stopSpeaking();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Initialize audio context and analyzer for visualization
  useEffect(() => {
    if (!audioContextRef.current) {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create analyzer
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Draw audio spectrum visualization
  const drawSpectrum = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !isSpeaking) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Get frequency data
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw spectrum
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height;
      
      // Use theme colors for visualization
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, theme.palette.primary.main);
      gradient.addColorStop(1, theme.palette.secondary.main);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
    
    animationRef.current = requestAnimationFrame(drawSpectrum);
  }, [isSpeaking, theme.palette.primary.main, theme.palette.secondary.main]);

  // Effect to handle visualization animation
  useEffect(() => {
    if (isSpeaking) {
      drawSpectrum();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      
      // Clear canvas when not speaking
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking, drawSpectrum]);

  // Split text into sentences to add pauses between them
  const splitIntoSentences = (text) => {
    return text
      .replace(/([.?!])\s+(?=[A-Z])/g, "$1|")  // Split on sentence endings followed by a capital letter
      .split("|");
  };

  // Speak text with natural-sounding speech
  const speakText = (text) => {
    // Cancel any ongoing speech
    stopSpeaking();
    
    const sentences = splitIntoSentences(text);
    let currentIndex = 0;
    
    setIsSpeaking(true);
    
    // Create audio source for visualization
    const oscillator = audioContextRef.current.createOscillator();
    oscillator.type = 'sine';
    oscillator.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    oscillator.start();
    
    const speakNextSentence = () => {
      if (currentIndex < sentences.length) {
        const sentence = sentences[currentIndex];
        utteranceRef.current = new SpeechSynthesisUtterance(sentence);
        
        // Find the selected voice
        const voice = availableVoices.find(v => v.name === selectedVoice);
        if (voice) utteranceRef.current.voice = voice;
        
        // Use the rate value to control speech speed
        utteranceRef.current.rate = rate; // This controls the speech speed
        utteranceRef.current.pitch = pitch;
        
        // Add natural variations to each sentence
        if (currentIndex > 0) {
          // Slight randomness in rate and pitch for more natural speech
          utteranceRef.current.rate = rate * (0.95 + Math.random() * 0.1); // ±5% variation
          utteranceRef.current.pitch = pitch * (0.98 + Math.random() * 0.04); // ±2% variation
        }
        
        utteranceRef.current.onend = () => {
          currentIndex++;
          // Add a small pause between sentences
          setTimeout(speakNextSentence, 250);
        };
        
        utteranceRef.current.onerror = (event) => {
          console.error('SpeechSynthesis error:', event);
          setIsSpeaking(false);
          oscillator.stop();
        };
        
        window.speechSynthesis.speak(utteranceRef.current);
      } else {
        setIsSpeaking(false);
        oscillator.stop();
      }
    };
    
    speakNextSentence();
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Simulate speech recognition
  const startListening = () => {
    setIsMicOn(true);
    // In a real app, this would connect to a speech recognition API
    setTimeout(() => {
      const newMessage = "Can you explain more about how you assigned the tasks to team members?";
      setTranscript(newMessage);
      
      // Add user message to conversation
      setMessages(prev => [...prev, { 
        sender: 'user', 
        text: newMessage,
        timestamp: new Date().toISOString()
      }]);
      
      // Simulate AI processing and response
      setTimeout(() => {
        const aiResponse = "I analyzed each team member's skills and matched them against task requirements. For each task, I calculated a confidence score based on skill overlap. This ensures team members work on tasks they're most qualified for. Would you like me to reassign any specific tasks?";
        
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: aiResponse,
          timestamp: new Date().toISOString()
        }]);
        
        if (onMessageReceived) {
          onMessageReceived(aiResponse);
        }
        
        // Speak the AI response
        speakText(aiResponse);
        
        setIsMicOn(false);
      }, 3000);
    }, 2000);
  };

  // Simulate AI speaking
  useEffect(() => {
    if (isActive && videoRef.current && projectContext) {
      // In a real implementation, this would render a realistic AI avatar
      // For demo, we're using a placeholder
      videoRef.current.poster = 'https://via.placeholder.com/640x480?text=AI+Assistant+Video';
      
      // Add initial AI greeting
      setTimeout(() => {
        const initialMessage = aiResponses[0];
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: initialMessage,
          timestamp: new Date().toISOString()
        }]);
        
        if (onMessageReceived) {
          onMessageReceived(initialMessage);
        }
        
        // Speak the initial greeting
        speakText(initialMessage);
      }, 1000);
    }
  }, [isActive, projectContext]);

  const startVideoCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Fix: Ensure we're properly setting the stream to the video element
      setStream(mediaStream);
      
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = mediaStream;
        // Fix: Ensure the video plays by explicitly calling play()
        userVideoRef.current.play().catch(err => console.error('Error playing video:', err));
      }
      
      setIsConnected(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopVideoCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsConnected(false);
  };

  const toggleConnection = () => {
    if (isConnected) {
      stopVideoCall();
    } else {
      startVideoCall();
    }
  };

  // Cleanup effect for video stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Fix: Ensure video displays properly when connection state changes
  useEffect(() => {
    if (isConnected && userVideoRef.current && stream) {
      userVideoRef.current.srcObject = stream;
      userVideoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
  }, [isConnected, stream]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleMic = () => {
    if (!isMicOn) {
      startListening();
    } else {
      setIsMicOn(false);
    }
  };

  return (
    <Paper 
      elevation={3}
      sx={{ 
        p: 3,
        mb: 3,
        bgcolor: theme.palette.background.paper,
        borderRadius: '16px',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.5)' 
          : '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 12px 48px rgba(0, 0, 0, 0.6)' 
            : '0 12px 48px rgba(0, 0, 0, 0.15)',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{
            fontWeight: 700,
            color: theme.palette.primary.main,
            letterSpacing: '-0.5px',
          }}
        >
          AI Video Assistant
        </Typography>
        <Button
          variant="contained"
          startIcon={isConnected ? <VideocamIcon /> : <VideocamOffIcon />}
          onClick={toggleConnection}
          color={isConnected ? "success" : "primary"}
          sx={{
            fontWeight: 600,
            px: 3,
            py: 1.2,
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            },
            transition: 'all 0.25s ease-in-out',
            fontSize: '0.95rem',
            textTransform: 'none',
          }}
        >
          {isConnected ? "Disconnect" : "Connect to Video Call"}
        </Button>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        gap: 3,
        height: { md: '460px' },
      }}>
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              flex: 1,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.03)',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: isConnected ? '1fr 1fr' : '1fr',
              gap: 2,
              p: 2,
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            {/* AI Video Feed */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                bgcolor: 'rgba(0,0,0,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <video 
                ref={videoRef}
                width="100%" 
                height="100%" 
                autoPlay 
                muted={isMuted}
                loop
                style={{ 
                  objectFit: 'cover',
                  borderRadius: '12px',
                  backgroundColor: '#000',
                  flex: 1,
                }}
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23000'/%3E%3Ccircle cx='400' cy='300' r='120' fill='%23555'/%3E%3Crect x='300' y='450' width='200' height='200' rx='25' fill='%23555'/%3E%3C/svg%3E"
              />
              
              {/* Audio Spectrum Visualization */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '60px',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 12px',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                }}
              >
                <canvas 
                  ref={canvasRef} 
                  width={300} 
                  height={50}
                  style={{
                    width: '100%',
                    height: '100%',
                    opacity: isSpeaking ? 1 : 0.3,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              </Box>
              
              <Typography
                sx={{
                  position: 'absolute',
                  bottom: 70,
                  left: 12,
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.6)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                AI Assistant
              </Typography>
            </Box>
            
            {/* User Video Feed */}
            {isConnected && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  bgcolor: 'rgba(0,0,0,0.3)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                <video
                  ref={userVideoRef}
                  width="100%"
                  height="100%"
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    objectFit: 'cover',
                    borderRadius: '12px',
                    transform: 'scaleX(-1)', // Mirror effect
                    backgroundColor: '#000',
                  }}
                />
                <Typography
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    color: 'white',
                    bgcolor: 'rgba(0,0,0,0.6)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  You
                </Typography>
              </Box>
            )}
            
            <Box sx={{ 
              position: 'absolute', 
              bottom: 20, 
              left: 0, 
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              zIndex: 10,
            }}>
              <IconButton 
                onClick={toggleMute}
                sx={{
                  bgcolor: isMuted ? 'error.main' : 'primary.main',
                  color: 'white',
                  p: 1.5,
                  '&:hover': {
                    bgcolor: isMuted ? 'error.dark' : 'primary.dark',
                    transform: 'scale(1.1)',
                  },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
              
              <IconButton 
                onClick={toggleMic}
                sx={{
                  bgcolor: isMicOn ? 'success.main' : 'primary.main',
                  color: 'white',
                  p: 1.5,
                  '&:hover': {
                    bgcolor: isMicOn ? 'success.dark' : 'primary.dark',
                    transform: 'scale(1.1)',
                  },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {isMicOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Box>
          </Box>
          
          {transcript && (
            <Paper 
              elevation={2}
              sx={{ 
                mt: 2, 
                p: 2.5, 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.palette.background.default,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
                  : '0 4px 20px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>You said:</Box> {transcript}
              </Typography>
            </Paper>
          )}
        </Box>
        
        <Box sx={{ 
          flex: 1,
          height: { xs: 300, md: '100%' },
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : theme.palette.background.default,
          borderRadius: '16px',
          p: 2.5,
          overflowY: 'auto',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
            : '0 4px 20px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              color: theme.palette.primary.main,
              mb: 2,
              pb: 1.5,
              borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            Conversation
          </Typography>
          
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {messages.map((message, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%',
                }}
              >
                <Box sx={{
                  maxWidth: '85%',
                  p: 2,
                  borderRadius: '16px',
                  bgcolor: message.sender === 'user' 
                    ? 'primary.main'
                    : theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.08)' 
                      : 'rgba(0,0,0,0.04)',
                  color: message.sender === 'user' ? 'white' : 'text.primary',
                  boxShadow: message.sender === 'user'
                    ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                    : 'none',
                  borderTopLeftRadius: message.sender === 'ai' ? 0 : '16px',
                  borderTopRightRadius: message.sender === 'user' ? 0 : '16px',
                }}>
                  <Typography variant="body1" sx={{ lineHeight: 1.5 }}>
                    {message.text}
                  </Typography>
                </Box>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    mt: 0.5, 
                    fontSize: '0.75rem',
                    px: 1, 
                  }}
                >
                  {message.sender === 'user' ? 'You' : 'AI Assistant'} · {
                    new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit', 
                      minute: '2-digit'
                    })
                  }
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default AIVideoInterface;