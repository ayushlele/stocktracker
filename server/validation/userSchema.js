const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  pin: Joi.string().pattern(/^\d{4,6}$/).required()
    .messages({ 'string.pattern.base': 'PIN must be 4-6 digits' }),
  role: Joi.string().valid('admin', 'staff').required(),
});

const editUserSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).optional(),
  role: Joi.string().valid('admin', 'staff').optional(),
  is_active: Joi.boolean().optional(),
});

const resetPinSchema = Joi.object({
  pin: Joi.string().pattern(/^\d{4,6}$/).required()
    .messages({ 'string.pattern.base': 'PIN must be 4-6 digits' }),
});

module.exports = { createUserSchema, editUserSchema, resetPinSchema };
