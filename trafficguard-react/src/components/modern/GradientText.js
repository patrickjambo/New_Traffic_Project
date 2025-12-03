// src/components/modern/GradientText.js
import React from 'react';
import { Typography } from '@mui/material';
import { motion } from 'framer-motion';

const GradientText = ({ 
  children, 
  variant = 'h1', 
  animated = true,
  colors = ['#8A2BE2', '#236BFF', '#00F6FF', '#FF1BAA'],
  sx = {},
  ...props 
}) => {
  const gradientStyle = {
    background: `linear-gradient(135deg, ${colors.join(', ')})`,
    backgroundSize: animated ? '200% 200%' : '100% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: animated ? 'gradientText 3s ease infinite' : 'none',
    '@keyframes gradientText': {
      '0%': { backgroundPosition: '0% 50%' },
      '50%': { backgroundPosition: '100% 50%' },
      '100%': { backgroundPosition: '0% 50%' },
    },
    ...sx,
  };

  return (
    <Typography
      variant={variant}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      sx={gradientStyle}
      {...props}
    >
      {children}
    </Typography>
  );
};

export default GradientText;
