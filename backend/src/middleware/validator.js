const Joi = require('joi');

/**
 * Validate request body against schema
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors,
            });
        }

        req.validatedBody = value;
        next();
    };
};

// Validation schemas
const schemas = {
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        fullName: Joi.string().min(2).max(100).optional(),
        full_name: Joi.string().min(2).max(100).optional(),
        phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).optional(),
        phone_number: Joi.string().pattern(/^\+?[0-9]{10,15}$/).optional(),
        role: Joi.string().valid('public', 'police', 'admin', 'user').default('public'),
    }).or('fullName', 'full_name'),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),

    reportIncident: Joi.object({
        type: Joi.string().required(), // More flexible, mapping in controller
        severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        address: Joi.string().max(500).optional(),
        description: Joi.string().max(1000).optional(),
        isAnonymous: Joi.boolean().default(false),
    }),

    updateIncidentStatus: Joi.object({
        status: Joi.string().valid('verified', 'in_progress', 'resolved', 'dismissed').required(),
        comment: Joi.string().max(500).optional(),
    }),

    nearbyIncidents: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        radius: Joi.number().min(0.1).max(50).default(5), // km
        status: Joi.string().valid('reported', 'verified', 'in_progress', 'resolved', 'dismissed').optional(),
        type: Joi.string().valid('congestion', 'accident', 'road_blockage', 'other').optional(),
        limit: Joi.number().min(1).max(100).default(20),
        offset: Joi.number().min(0).default(0),
    }),
};

module.exports = {
    validate,
    schemas,
};
