// src/components/modern/NeonButton.js
import React, { useState } from 'react';
import { Button } from '@mui/material';
import { motion } from 'framer-motion';

const NeonButton = ({ 
  children, 
  glowColor = '#00F6FF',
  variant = 'contained',
  size = 'large',
  onClick,
  sx = {},
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        sx={{
          background: `linear-gradient(135deg, ${glowColor} 0%, #8A2BE2 100%)`,
          color: '#fff',
          fontWeight: 700,
          borderRadius: '12px',
          padding: '12px 32px',
          fontSize: '1.1rem',
          textTransform: 'none',
          position: 'relative',
          overflow: 'hidden',
          border: `2px solid ${glowColor}`,
          boxShadow: `0 0 20px ${glowColor}40`,
          transition: 'all 0.3s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: isHovered ? '300%' : '0%',
            height: isHovered ? '300%' : '0%',
            background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.5s ease',
            pointerEvents: 'none',
          },
          '&:hover': {
            boxShadow: `0 0 40px ${glowColor}60, 0 0 60px ${glowColor}40`,
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  );
};

export default NeonButton;
