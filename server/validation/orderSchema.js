const Joi = require('joi');

const createOrderSchema = Joi.object({
  order_number: Joi.string().trim().min(1).required(),
  style_name: Joi.string().trim().min(1).required(),
  buyer_name: Joi.string().trim().allow(null, '').optional(),
  order_date: Joi.string().isoDate().allow(null, '').optional(),
  notes: Joi.string().trim().allow(null, '').optional(),
});

const editOrderSchema = Joi.object({
  order_number: Joi.string().trim().min(1).optional(),
  style_name: Joi.string().trim().min(1).optional(),
  buyer_name: Joi.string().trim().allow(null, '').optional(),
  order_date: Joi.string().isoDate().allow(null, '').optional(),
  notes: Joi.string().trim().allow(null, '').optional(),
});

module.exports = { createOrderSchema, editOrderSchema };
