import React from 'react';
import { Box, Skeleton as MuiSkeleton } from '@mui/material';

const SkeletonLoader = ({ type = 'card', count = 1, height, width, sx = {} }) => {
    // Custom shimmer animation style
    const shimmerStyle = {
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 37%, rgba(255, 255, 255, 0.05) 63%)',
        backgroundSize: '400% 100%',
        animation: 'shimmer 1.4s ease infinite',
        borderRadius: '12px',
        ...sx,
    };

    const renderSkeleton = () => {
        switch (type) {
            case 'text':
                return (
                    <Box>
                        {Array.from({ length: count }).map((_, index) => (
                            <MuiSkeleton
                                key={index}
                                variant="text"
                                height={height || 20}
                                width={width || '100%'}
                                sx={{ mb: 1, borderRadius: 1, ...sx }}
                                animation="wave"
                            />
                        ))}
                    </Box>
                );

            case 'title':
                return (
                    <MuiSkeleton
                        variant="text"
                        height={height || 40}
                        width={width || '60%'}
                        animation="wave"
                        sx={{ mb: 2, borderRadius: 2, ...sx }}
                    />
                );

            case 'card':
                return (
                    <Box>
                        {Array.from({ length: count }).map((_, index) => (
                            <Box key={index} sx={{ mb: 3 }}>
                                <MuiSkeleton
                                    variant="rectangular"
                                    height={height || 200}
                                    width={width || '100%'}
                                    sx={{ borderRadius: 4, mb: 2, ...sx }}
                                    animation="wave"
                                />
                                <Box sx={{ px: 1 }}>
                                    <MuiSkeleton variant="text" width="80%" height={24} animation="wave" sx={{ mb: 1 }} />
                                    <MuiSkeleton variant="text" width="60%" height={20} animation="wave" />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                );

            case 'circular':
                return (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        {Array.from({ length: count }).map((_, index) => (
                            <MuiSkeleton
                                key={index}
                                variant="circular"
                                width={width || 60}
                                height={height || 60}
                                animation="wave"
                                sx={{ ...sx }}
                            />
                        ))}
                    </Box>
                );

            case 'list':
                return (
                    <Box>
                        {Array.from({ length: count }).map((_, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                                <MuiSkeleton variant="circular" width={48} height={48} animation="wave" />
                                <Box sx={{ flex: 1 }}>
                                    <MuiSkeleton variant="text" width="90%" height={24} animation="wave" sx={{ mb: 0.5 }} />
                                    <MuiSkeleton variant="text" width="70%" height={20} animation="wave" />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                );

            case 'table':
                return (
                    <Box>
                        <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2, ...sx }} animation="wave" />
                        {Array.from({ length: count || 5 }).map((_, index) => (
                            <MuiSkeleton
                                key={index}
                                variant="rectangular"
                                height={48}
                                sx={{ mb: 1.5, borderRadius: 2, opacity: 0.7, ...sx }}
                                animation="wave"
                            />
                        ))}
                    </Box>
                );

            case 'dashboard':
                return (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 3 }}>
                        {Array.from({ length: count || 4 }).map((_, index) => (
                            <MuiSkeleton
                                key={index}
                                variant="rectangular"
                                height={140}
                                sx={{ borderRadius: 4, ...sx }}
                                animation="wave"
                            />
                        ))}
                    </Box>
                );

            default:
                return <MuiSkeleton variant="rectangular" height={height || 200} width={width || '100%'} animation="wave" sx={{ borderRadius: 2, ...sx }} />;
        }
    };

    return renderSkeleton();
};

export default SkeletonLoader;
