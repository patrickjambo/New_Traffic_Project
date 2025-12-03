// src/components/common/VideoUploader.js
import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  IconButton,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  PlayArrow,
  Pause,
  Close,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const VideoUploader = ({ onUpload, maxSize = 50, acceptedFormats = ['video/mp4', 'video/webm', 'video/quicktime'] }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');

    if (!selectedFile) return;

    // Check file type
    if (!acceptedFormats.includes(selectedFile.type)) {
      setError('Invalid file format. Please upload MP4, WebM, or MOV video.');
      return;
    }

    // Check file size (convert MB to bytes)
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // Simulate upload progress
      const formData = new FormData();
      formData.append('video', file);

      // Mock progress simulation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Call the onUpload callback
      if (onUpload) {
        await onUpload(formData);
      }

      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        setUploading(false);
      }, 500);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Paper
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 4,
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'center',
                bgcolor: 'background.default',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: 'action.hover',
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drop video here or click to upload
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports: MP4, WebM, MOV (Max {maxSize}MB)
              </Typography>
            </Paper>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Paper sx={{ p: 2, position: 'relative' }}>
              <IconButton
                onClick={handleRemove}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'background.paper',
                  zIndex: 1,
                  '&:hover': { bgcolor: 'error.main', color: 'white' },
                }}
                size="small"
              >
                <Close />
              </IconButton>

              {preview && (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <video
                    ref={videoRef}
                    src={preview}
                    style={{
                      width: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      bgcolor: '#000',
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                  />
                  <IconButton
                    onClick={togglePlay}
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    }}
                  >
                    {playing ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>

              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Uploading...</Typography>
                    <Typography variant="body2">{progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={handleUpload}
                  disabled={uploading || progress === 100}
                >
                  {progress === 100 ? 'Uploaded' : uploading ? 'Uploading...' : 'Upload Video'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  Remove
                </Button>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default VideoUploader;
