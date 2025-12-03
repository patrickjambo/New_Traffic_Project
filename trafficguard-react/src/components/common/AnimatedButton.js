import React, { useState } from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from '@mui/icons-material';

const AnimatedButton = ({
    children,
    onClick,
    loading = false,
    success = false,
    variant = 'contained',
    color = 'primary',
    size = 'medium',
    startIcon,
    endIcon,
    glow = false,
    gradient = false,
    sx = {},
    ...props
}) => {
    const [ripples, setRipples] = useState([]);

    const handleClick = (e) => {
        if (loading || success) return;

        // Create ripple effect
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
            x,
            y,
            id: Date.now(),
        };

        setRipples([...ripples, newRipple]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);

        if (onClick) {
            onClick(e);
        }
    };

    // Gradient styles
    const gradientStyle = gradient ? {
        background: 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)',
        color: 'white',
        border: 'none',
        '&:hover': {
            background: 'linear-gradient(135deg, #5B96F5 0%, #2D6FD6 100%)',
        }
    } : {};

    // Glow styles
    const glowStyle = glow ? {
        boxShadow: '0 0 10px rgba(66, 133, 244, 0.5), 0 0 20px rgba(66, 133, 244, 0.3)',
        '&:hover': {
            boxShadow: '0 0 15px rgba(66, 133, 244, 0.7), 0 0 30px rgba(66, 133, 244, 0.5)',
        }
    } : {};

    return (
        <MuiButton
            variant={variant}
            color={color}
            size={size}
            onClick={handleClick}
            disabled={loading || success}
            {...props}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                ...gradientStyle,
                ...glowStyle,
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    ...gradientStyle['&:hover'],
                    ...glowStyle['&:hover'],
                },
                '&:active': {
                    transform: 'translateY(0)',
                },
                ...sx,
            }}
        >
            <motion.div
                initial={false}
                animate={{
                    scale: loading || success ? 0.9 : 1,
                    opacity: loading || success ? 0.7 : 1,
                }}
                transition={{ duration: 0.2 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                }}
            >
                {loading && (
                    <CircularProgress
                        size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
                        color="inherit"
                        sx={{ mr: 1 }}
                    />
                )}
                {success && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <Check sx={{ mr: 1 }} />
                    </motion.div>
                )}
                {!loading && !success && startIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{startIcon}</span>}
                {children}
                {!loading && !success && endIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{endIcon}</span>}
            </motion.div>

            {/* Ripple effects */}
            <AnimatePresence>
                {ripples.map((ripple) => (
                    <motion.span
                        key={ripple.id}
                        initial={{
                            width: 0,
                            height: 0,
                            opacity: 0.5,
                        }}
                        animate={{
                            width: 500,
                            height: 500,
                            opacity: 0,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{
                            position: 'absolute',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.3)',
                            left: ripple.x,
                            top: ripple.y,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                        }}
                    />
                ))}
            </AnimatePresence>
        </MuiButton>
    );
};

export default AnimatedButton;
