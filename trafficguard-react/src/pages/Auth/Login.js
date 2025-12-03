import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import DarkModeToggle from '../../components/layout/DarkModeToggle';
import AnimatedButton from '../../components/common/AnimatedButton';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Redirect based on role
      switch (result.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'police':
          navigate('/police');
          break;
        default:
          navigate('/dashboard');
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        position: 'relative',
      }}
    >
      {/* Dark Mode Toggle */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
          p: 1,
        }}
      >
        <DarkModeToggle />
      </Box>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 4,
              borderRadius: 3,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                🚦 TrafficGuard AI
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Welcome back! Please login to continue.
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="primary" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <AnimatedButton
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                loading={loading}
                sx={{
                  mb: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A5FC7 0%, #4285F4 100%)',
                  },
                }}
              >
                Login
              </AnimatedButton>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link
                    component={RouterLink}
                    to="/register"
                    sx={{ fontWeight: 600, textDecoration: 'none' }}
                  >
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </form>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Link
                component={RouterLink}
                to="/"
                sx={{ textDecoration: 'none', color: 'text.secondary' }}
              >
                ← Back to Home
              </Link>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Login;
