const { query } = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

/**
 * Register new user
 */
const register = async (req, res) => {
    try {
        const { email, password, fullName, full_name, phone, phone_number, role } = req.validatedBody;

        // Map fields
        const finalFullName = fullName || full_name;
        const finalPhone = phone || phone_number;
        const finalRole = role === 'user' ? 'public' : (role || 'public');

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered',
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Insert new user
        const result = await query(
            `INSERT INTO users (email, password_hash, full_name, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, role, created_at`,
            [email, passwordHash, finalFullName, finalPhone || null, finalRole]
        );

        const user = result.rows[0];

        // Generate token
        const token = generateToken(user.id, user.email, user.role);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    createdAt: user.created_at,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message,
        });
    }
};

/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.validatedBody;

        // Find user by email (include district info for district admins)
        const result = await query(
            `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active, u.district_id, d.name as district_name
             FROM users u
             LEFT JOIN districts d ON u.district_id = d.id
             WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        const user = result.rows[0];

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated',
            });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Generate token (include district_id for district admins)
        const token = generateToken(user.id, user.email, user.role, user.district_id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    districtId: user.district_id,
                    districtName: user.district_name,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message,
        });
    }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.profile_picture, u.created_at,
                    d.name as district_name
             FROM users u
             LEFT JOIN districts d ON u.district_id = d.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                profile_picture: user.profile_picture,
                districtName: user.district_name,
                createdAt: user.created_at,
            },
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message,
        });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const userId = req.user.id;
        
        let profilePicturePath = null;
        
        // Handle file upload if present
        if (req.file) {
            profilePicturePath = `/uploads/profiles/${req.file.filename}`;
        }
        
        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (full_name) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }
        
        if (profilePicturePath) {
            updates.push(`profile_picture = $${paramIndex++}`);
            values.push(profilePicturePath);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
            });
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(userId);
        
        const result = await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, phone, role, profile_picture`,
            values
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        
        const user = result.rows[0];
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                profile_picture: user.profile_picture,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message,
        });
    }
};

/**
 * Change user password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required',
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters',
            });
        }
        
        // Get current user
        const userResult = await query(
            'SELECT password FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        
        // Verify current password
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
        
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await query(
            'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, userId]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message,
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
};
