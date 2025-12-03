import React from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const DarkModeToggle = ({ size = 'medium', showLabel = false }) => {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showLabel && darkMode && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                >
                    <Box component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
                        Dark
                    </Box>
                </motion.div>
            )}

            <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <IconButton
                    onClick={toggleDarkMode}
                    size={size}
                    sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            transform: 'rotate(180deg)',
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: darkMode ? 360 : 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {darkMode ? (
                            <Brightness7 sx={{ color: '#FFD700' }} />
                        ) : (
                            <Brightness4 sx={{ color: '#4285F4' }} />
                        )}
                    </motion.div>
                </IconButton>
            </Tooltip>

            {showLabel && !darkMode && (
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                >
                    <Box component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
                        Light
                    </Box>
                </motion.div>
            )}
        </Box>
    );
};

export default DarkModeToggle;
