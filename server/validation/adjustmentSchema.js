const Joi = require('joi');

const adjustmentSchema = Joi.object({
  quantity_delta: Joi.number().not(0).required()
    .messages({ 'any.invalid': 'Delta must be a non-zero number (positive or negative)' }),
  reason: Joi.string().trim().min(1).required()
    .messages({ 'string.empty': 'A reason is required for all stock adjustments' }),
});

module.exports = { adjustmentSchema };
