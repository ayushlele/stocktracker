const Joi = require('joi');

const usageSchema = Joi.object({
  quantity_used_meters: Joi.number().positive().required()
    .messages({ 'number.positive': 'Quantity must be a positive number' }),
  date_used: Joi.string().isoDate().optional(),
  used_for: Joi.string().trim().allow(null, '').optional(),
  notes: Joi.string().trim().allow(null, '').optional(),
});

module.exports = { usageSchema };
