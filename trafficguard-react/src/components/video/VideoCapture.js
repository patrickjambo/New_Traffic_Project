// src/components/video/VideoCapture.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Videocam,
  Stop,
  Close,
  CheckCircle,
  Warning,
  CloudUpload,
  SmartToy,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';

const VideoCapture = ({ open, onClose, onSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [stream, setStream] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Maximum recording time (30 seconds)
  const MAX_RECORDING_TIME = 30;

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Back camera on mobile
        },
        audio: true,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
      toast.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) {
      setError('Camera not initialized');
      return;
    }

    try {
      chunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        toast.success('Video recorded successfully!');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setError('');
      toast.success('Recording started', { icon: '🎥' });
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording');
      toast.error('Recording failed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAndAnalyze = async () => {
    if (!recordedBlob) {
      setError('No video recorded');
      return;
    }

    setUploadProgress(0);
    setAiAnalyzing(true);
    setError('');

    try {
      // Step 1: Upload video and trigger AI analysis
      toast.loading('Uploading video for AI analysis...', { id: 'ai-upload' });

      const formData = new FormData();
      const videoFile = new File([recordedBlob], `traffic_${Date.now()}.webm`, {
        type: 'video/webm',
      });
      formData.append('video', videoFile);

      // Get user's location for context
      let location = null;
      try {
        const position = await getCurrentPosition();
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (err) {
        console.warn('Location not available:', err);
      }

      if (location) {
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
      }

      // Upload to backend which will forward to AI service
      const response = await apiService.analyzeVideoAndCreateIncident(formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      toast.dismiss('ai-upload');

      if (response.data.success) {
        const aiData = response.data.data;
        setAiResults(aiData);

        // Show results based on incident detection
        if (aiData.incident_detected) {
          toast.success(
            `🚨 Incident Detected: ${aiData.incident_type} (${Math.round(aiData.confidence * 100)}% confidence)`,
            { duration: 5000 }
          );

          // Determine severity based on incident type and confidence
          const severity = getSeverity(aiData.incident_type, aiData.confidence);

          toast(
            `Severity: ${severity.toUpperCase()} | Vehicles: ${aiData.vehicle_count} | Speed: ${Math.round(aiData.avg_speed)} km/h`,
            {
              duration: 4000,
              icon: severity === 'critical' ? '🚨' : '⚠️',
            }
          );

          // Trigger notification
          if (onSuccess) {
            onSuccess(aiData);
          }
        } else {
          toast('No incidents detected in the video', {
            icon: '✅',
            duration: 3000,
          });
        }
      } else {
        throw new Error(response.data.message || 'Analysis failed');
      }
    } catch (err) {
      console.error('Upload/Analysis error:', err);
      setError(err.response?.data?.message || 'Failed to analyze video');
      toast.error('Failed to analyze video', { id: 'ai-upload' });
    } finally {
      setAiAnalyzing(false);
      setUploadProgress(0);
    }
  };

  const getSeverity = (incidentType, confidence) => {
    if (incidentType === 'accident') {
      return confidence > 0.7 ? 'critical' : 'high';
    } else if (incidentType === 'road_blockage') {
      return 'high';
    } else if (incidentType === 'congestion') {
      return confidence > 0.7 ? 'medium' : 'low';
    }
    return 'low';
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }
    });
  };

  const handleClose = () => {
    stopRecording();
    stopCamera();
    setRecordedBlob(null);
    setAiResults(null);
    setError('');
    setRecordingTime(0);
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Videocam />
          <Typography variant="h6">AI-Powered Video Analysis</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Camera Preview / Recorded Video */}
        <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden', borderRadius: 2 }}>
          <Box
            sx={{
              position: 'relative',
              paddingTop: '56.25%', // 16:9 aspect ratio
              bgcolor: 'black',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isRecording}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Recording Indicator */}
            {isRecording && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'error.main',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    bgcolor: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                    },
                  }}
                />
                <Typography variant="body2" fontWeight="bold">
                  REC {formatTime(recordingTime)}
                </Typography>
              </Box>
            )}

            {/* Recording Time Limit */}
            {isRecording && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">
                  {formatTime(MAX_RECORDING_TIME - recordingTime)} left
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Upload Progress */}
        {aiAnalyzing && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <SmartToy color="primary" />
              <Typography variant="body2" color="text.secondary">
                {uploadProgress < 100
                  ? `Uploading video... ${uploadProgress}%`
                  : 'AI analyzing traffic patterns...'}
              </Typography>
              <CircularProgress size={20} />
            </Box>
            <LinearProgress
              variant={uploadProgress < 100 ? 'determinate' : 'indeterminate'}
              value={uploadProgress}
            />
          </Box>
        )}

        {/* AI Results */}
        <AnimatePresence>
          {aiResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  bgcolor: aiResults.incident_detected ? 'error.light' : 'success.light',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {aiResults.incident_detected ? (
                    <Warning sx={{ fontSize: 40, color: 'error.dark' }} />
                  ) : (
                    <CheckCircle sx={{ fontSize: 40, color: 'success.dark' }} />
                  )}
                  <Box>
                    <Typography variant="h6">
                      {aiResults.incident_detected ? 'Incident Detected!' : 'No Incident'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {aiResults.incident_detected
                        ? `Type: ${aiResults.incident_type}`
                        : 'Traffic appears normal'}
                    </Typography>
                  </Box>
                </Box>

                {aiResults.incident_detected && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label={`Confidence: ${Math.round(aiResults.confidence * 100)}%`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Vehicles: ${aiResults.vehicle_count}`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`Speed: ${Math.round(aiResults.avg_speed)} km/h`}
                      variant="outlined"
                      size="small"
                    />
                    {aiResults.stationary_count > 0 && (
                      <Chip
                        label={`Stationary: ${aiResults.stationary_count}`}
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                )}
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {!recordedBlob && !isRecording && (
          <Alert severity="info" icon={<Videocam />}>
            Point your camera at traffic and click "Start Recording". Maximum recording time:{' '}
            {MAX_RECORDING_TIME} seconds.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!recordedBlob && (
          <>
            {!isRecording ? (
              <Button
                variant="contained"
                color="error"
                startIcon={<Videocam />}
                onClick={startRecording}
                size="large"
                fullWidth
              >
                Start Recording
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={stopRecording}
                size="large"
                fullWidth
              >
                Stop Recording
              </Button>
            )}
          </>
        )}

        {recordedBlob && !aiAnalyzing && (
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setRecordedBlob(null);
                setAiResults(null);
                startCamera();
              }}
              fullWidth
            >
              Re-record
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CloudUpload />}
              onClick={uploadAndAnalyze}
              fullWidth
            >
              Analyze with AI
            </Button>
          </Box>
        )}

        {aiResults && (
          <Button variant="outlined" onClick={handleClose} fullWidth>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VideoCapture;
