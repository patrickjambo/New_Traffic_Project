// src/components/modern/GlassCard.js
import React from 'react';
import { Card, CardContent } from '@mui/material';
import { motion } from 'framer-motion';

const GlassCard = ({ children, neonBorder = false, hoverGlow = true, sx = {}, ...props }) => {
  return (
    <motion.div
      whileHover={hoverGlow ? { scale: 1.02, y: -4 } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card
        sx={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: neonBorder 
            ? '1px solid rgba(0, 246, 255, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: neonBorder
            ? '0 0 20px rgba(0, 246, 255, 0.2)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': neonBorder ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00F6FF, transparent)',
            animation: 'shimmer 2s infinite',
          } : {},
          '&:hover': hoverGlow ? {
            borderColor: neonBorder ? 'rgba(0, 246, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)',
            boxShadow: neonBorder 
              ? '0 0 40px rgba(0, 246, 255, 0.4)'
              : '0 12px 48px 0 rgba(31, 38, 135, 0.25)',
          } : {},
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
          ...sx,
        }}
        {...props}
      >
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GlassCard;
