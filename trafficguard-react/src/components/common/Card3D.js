import React, { useRef, useState } from 'react';
import { Card as MuiCard } from '@mui/material';
import { motion } from 'framer-motion';

const Card3D = ({
    children,
    sx = {},
    glowEffect = false,
    glass = false,
    gradientBorder = false,
    ...props
}) => {
    const cardRef = useRef(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;

        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateXCalc = ((y - centerY) / centerY) * -5; // Reduced rotation for subtlety
        const rotateYCalc = ((x - centerX) / centerX) * 5;

        setRotateX(rotateXCalc);
        setRotateY(rotateYCalc);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    // Glassmorphism styles
    const glassStyle = glass ? {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    } : {};

    // Gradient border styles
    const gradientBorderStyle = gradientBorder ? {
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.05)', // Transparent background
        backgroundClip: 'padding-box',
        border: '2px solid transparent',
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: -1,
            margin: '-2px',
            borderRadius: 'inherit',
            background: 'linear-gradient(135deg, #4285F4, #34A853, #EA4335)',
        },
    } : {};

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{
                rotateX,
                rotateY,
            }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
            }}
            style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
                height: '100%',
            }}
        >
            <MuiCard
                {...props}
                sx={{
                    transformStyle: 'preserve-3d',
                    transition: 'all 0.3s ease',
                    height: '100%',
                    borderRadius: '16px',
                    ...(glowEffect && {
                        boxShadow: '0 0 20px rgba(66, 133, 244, 0.2)',
                        '&:hover': {
                            boxShadow: '0 0 30px rgba(66, 133, 244, 0.4)',
                        },
                    }),
                    ...glassStyle,
                    ...gradientBorderStyle,
                    ...sx,
                }}
            >
                {children}
            </MuiCard>
        </motion.div>
    );
};

export default Card3D;
