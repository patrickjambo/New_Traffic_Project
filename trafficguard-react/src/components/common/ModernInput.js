import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ErrorOutline } from '@mui/icons-material';

const ModernInput = ({
    error,
    success,
    helperText,
    startIcon,
    endIcon,
    sx = {},
    ...props
}) => {
    // Shake animation for error state
    const shakeVariants = {
        initial: { x: 0 },
        shake: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } },
    };

    return (
        <motion.div
            variants={shakeVariants}
            initial="initial"
            animate={error ? "shake" : "initial"}
            style={{ width: '100%' }}
        >
            <TextField
                error={!!error}
                helperText={helperText}
                fullWidth
                variant="outlined"
                InputProps={{
                    startAdornment: startIcon && (
                        <InputAdornment position="start">
                            {startIcon}
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <AnimatePresence>
                                {success && !error && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                    >
                                        <Check color="success" />
                                    </motion.div>
                                )}
                                {error && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                    >
                                        <ErrorOutline color="error" />
                                    </motion.div>
                                )}
                                {!success && !error && endIcon}
                            </AnimatePresence>
                        </InputAdornment>
                    ),
                    sx: {
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        backgroundColor: 'background.paper',
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                        '&.Mui-focused': {
                            backgroundColor: 'background.paper',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderWidth: '2px',
                            borderColor: 'primary.main',
                        },
                        ...(success && !error && {
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'success.main',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'success.main',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'success.main',
                            },
                        }),
                        ...sx,
                    },
                }}
                {...props}
            />
        </motion.div>
    );
};

export default ModernInput;
