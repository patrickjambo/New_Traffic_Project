import React, { useState, useEffect } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Box,
    Container,
    useScrollTrigger,
    Slide,
    Avatar,
    Menu,
    MenuItem,
    Tooltip,
    Badge,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Notifications,
    Traffic,
    Person,
    Settings,
    Logout,
    Login,
    Dashboard,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DarkModeToggle from './DarkModeToggle';
import { useAuth } from '../../contexts/AuthContext';

const HideOnScroll = ({ children }) => {
    const trigger = useScrollTrigger();
    return (
        <Slide appear={false} direction="down" in={!trigger}>
            {children}
        </Slide>
    );
};

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Handle scroll effect for glassmorphism
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleClose();
        logout();
        navigate('/login');
    };

    const navLinks = [
        { title: 'Home', path: '/' },
        { title: 'Live Map', path: '/map' },
        { title: 'Incidents', path: '/incidents' },
        { title: 'About', path: '/about' },
    ];

    return (
        <HideOnScroll>
            <AppBar
                position="fixed"
                elevation={scrolled ? 4 : 0}
                sx={{
                    background: scrolled
                        ? 'rgba(255, 255, 255, 0.7)'
                        : 'transparent',
                    backdropFilter: scrolled ? 'blur(20px)' : 'none',
                    borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                    transition: 'all 0.3s ease',
                    zIndex: 1100,
                    ...(props => props.theme.palette.mode === 'dark' && {
                        background: scrolled
                            ? 'rgba(18, 18, 18, 0.7)'
                            : 'transparent',
                        borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    }),
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ height: 80 }}>
                        {/* Logo */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => navigate('/')}
                        >
                            <Traffic sx={{
                                fontSize: 40,
                                mr: 1,
                                color: scrolled ? 'primary.main' : 'white',
                                filter: 'drop-shadow(0 0 10px rgba(66, 133, 244, 0.5))'
                            }} />
                            <Typography
                                variant="h5"
                                noWrap
                                sx={{
                                    fontWeight: 800,
                                    letterSpacing: '.1rem',
                                    background: scrolled
                                        ? 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)'
                                        : 'white',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    textShadow: scrolled ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                            >
                                TRAFFICGUARD
                            </Typography>
                        </motion.div>

                        <Box sx={{ flexGrow: 1 }} />

                        {/* Desktop Navigation */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
                            {navLinks.map((link, index) => (
                                <Button
                                    key={link.title}
                                    onClick={() => navigate(link.path)}
                                    sx={{
                                        color: scrolled ? 'text.primary' : 'white',
                                        fontWeight: 600,
                                        position: 'relative',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            width: '0%',
                                            height: '2px',
                                            bottom: 0,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            backgroundColor: scrolled ? 'primary.main' : 'white',
                                            transition: 'width 0.3s ease',
                                        },
                                        '&:hover::after': {
                                            width: '80%',
                                        },
                                        '&:hover': {
                                            background: 'transparent',
                                            transform: 'translateY(-2px)',
                                        },
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {link.title}
                                </Button>
                            ))}

                            <Box sx={{ mx: 2, height: 24, width: 1, bgcolor: scrolled ? 'divider' : 'rgba(255,255,255,0.3)' }} />

                            <DarkModeToggle />

                            {user ? (
                                <Box sx={{ ml: 2 }}>
                                    <Tooltip title="Account settings">
                                        <IconButton
                                            onClick={handleMenu}
                                            sx={{
                                                p: 0.5,
                                                border: scrolled ? '2px solid transparent' : '2px solid rgba(255,255,255,0.5)',
                                                '&:hover': {
                                                    border: '2px solid',
                                                    borderColor: 'primary.main',
                                                },
                                            }}
                                        >
                                            <Avatar
                                                alt={user.name}
                                                src={user.avatar}
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    bgcolor: 'primary.main',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                {user.name?.charAt(0) || <Person />}
                                            </Avatar>
                                        </IconButton>
                                    </Tooltip>
                                    <Menu
                                        id="menu-appbar"
                                        anchorEl={anchorEl}
                                        anchorOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'right',
                                        }}
                                        keepMounted
                                        transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        open={Boolean(anchorEl)}
                                        onClose={handleClose}
                                        PaperProps={{
                                            elevation: 0,
                                            sx: {
                                                overflow: 'visible',
                                                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                                mt: 1.5,
                                                borderRadius: 3,
                                                minWidth: 200,
                                                '& .MuiAvatar-root': {
                                                    width: 32,
                                                    height: 32,
                                                    ml: -0.5,
                                                    mr: 1,
                                                },
                                            },
                                        }}
                                    >
                                        <Box sx={{ px: 2, py: 1 }}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {user.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {user.email}
                                            </Typography>
                                        </Box>
                                        <MenuItem onClick={() => { handleClose(); navigate('/dashboard'); }}>
                                            <Dashboard fontSize="small" sx={{ mr: 2 }} /> Dashboard
                                        </MenuItem>
                                        <MenuItem onClick={handleClose}>
                                            <Settings fontSize="small" sx={{ mr: 2 }} /> Settings
                                        </MenuItem>
                                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                            <Logout fontSize="small" sx={{ mr: 2 }} /> Logout
                                        </MenuItem>
                                    </Menu>
                                </Box>
                            ) : (
                                <Button
                                    variant="contained"
                                    startIcon={<Login />}
                                    onClick={() => navigate('/login')}
                                    sx={{
                                        ml: 2,
                                        borderRadius: '50px',
                                        px: 3,
                                        background: scrolled
                                            ? 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)'
                                            : 'rgba(255,255,255,0.2)',
                                        backdropFilter: scrolled ? 'none' : 'blur(10px)',
                                        border: scrolled ? 'none' : '1px solid rgba(255,255,255,0.3)',
                                        boxShadow: scrolled ? '0 4px 14px rgba(66, 133, 244, 0.4)' : 'none',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 6px 20px rgba(66, 133, 244, 0.6)',
                                            background: scrolled
                                                ? 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)'
                                                : 'rgba(255,255,255,0.3)',
                                        }
                                    }}
                                >
                                    Login
                                </Button>
                            )}
                        </Box>

                        {/* Mobile Menu Icon */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                            <IconButton
                                size="large"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                sx={{ color: scrolled ? 'text.primary' : 'white' }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>
        </HideOnScroll>
    );
};

export default Navbar;
