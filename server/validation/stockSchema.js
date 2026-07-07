const Joi = require('joi');

const STORAGE_LOCATIONS = ['Dyeing Unit', 'Umargaon Factory', 'Kalyan Factory', 'Sakinaka Office', 'Other'];
// "Used" is NEVER accepted from the client — it's auto-only via remaining_quantity logic
const ALLOWED_MANUAL_STATUSES = ['Available', 'Reserved', 'Disposed'];

/**
 * Schema for creating a new leftover stock entry.
 * original_quantity_meters is required; lot_code and remaining_quantity_meters are forbidden.
 */
const createStockSchema = Joi.object({
  fabric_type_id: Joi.number().integer().positive().required(),
  color: Joi.string().trim().min(1).required(),
  color_hex: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, '').optional(),

  has_embroidery: Joi.boolean().default(false),
  embroidery_type_id: Joi.when('has_embroidery', {
    is: true,
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.valid(null).optional(),
  }),
  embroidery_description: Joi.string().trim().allow(null, '').optional(),

  has_printing: Joi.boolean().default(false),
  printing_type_id: Joi.when('has_printing', {
    is: true,
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.valid(null).optional(),
  }),
  printing_description: Joi.string().trim().allow(null, '').optional(),

  other_design_notes: Joi.string().trim().allow(null, '').optional(),
  order_id: Joi.number().integer().positive().allow(null).optional(),

  condition_id: Joi.number().integer().positive().required(),
  // condition_notes: required if condition is "Other" — validated server-side in route
  // because we need to look up the is_other flag from DB
  condition_notes: Joi.string().trim().allow(null, '').optional(),

  date_logged: Joi.string().isoDate().optional(),

  original_quantity_meters: Joi.number().positive().required(),

  reason_id: Joi.number().integer().positive().required(),
  // reason_other_text: required if reason is "Other" — validated server-side in route
  reason_other_text: Joi.string().trim().allow(null, '').optional(),

  storage_location: Joi.string().valid(...STORAGE_LOCATIONS).required(),
  storage_location_other_text: Joi.when('storage_location', {
    is: 'Other',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.valid(null, '').optional(),
  }),

  // Forbidden on create — system-managed
  lot_code: Joi.forbidden(),
  remaining_quantity_meters: Joi.forbidden(),
  status: Joi.forbidden(),
});

/**
 * Schema for editing an existing leftover stock entry.
 * original_quantity_meters, remaining_quantity_meters, lot_code are all FORBIDDEN.
 * Status is restricted to Available/Reserved/Disposed — "Used" is auto-only.
 */
const editStockSchema = Joi.object({
  fabric_type_id: Joi.number().integer().positive().optional(),
  color: Joi.string().trim().min(1).optional(),
  color_hex: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, '').optional(),

  has_embroidery: Joi.boolean().optional(),
  embroidery_type_id: Joi.number().integer().positive().allow(null).optional(),
  embroidery_description: Joi.string().trim().allow(null, '').optional(),

  has_printing: Joi.boolean().optional(),
  printing_type_id: Joi.number().integer().positive().allow(null).optional(),
  printing_description: Joi.string().trim().allow(null, '').optional(),

  other_design_notes: Joi.string().trim().allow(null, '').optional(),
  order_id: Joi.number().integer().positive().allow(null).optional(),

  condition_id: Joi.number().integer().positive().optional(),
  condition_notes: Joi.string().trim().allow(null, '').optional(),

  date_logged: Joi.string().isoDate().optional(),

  reason_id: Joi.number().integer().positive().optional(),
  reason_other_text: Joi.string().trim().allow(null, '').optional(),

  storage_location: Joi.string().valid(...STORAGE_LOCATIONS).optional(),
  storage_location_other_text: Joi.when('storage_location', {
    is: 'Other',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().trim().allow(null, '').optional(),
  }),

  // Status: only manual statuses allowed — "Used" is auto-only
  status: Joi.string().valid(...ALLOWED_MANUAL_STATUSES).optional(),

  // FORBIDDEN — immutable / system-managed
  original_quantity_meters: Joi.forbidden()
    .messages({ 'any.unknown': 'original_quantity_meters is immutable and cannot be changed. Use Stock Adjustments for corrections.' }),
  remaining_quantity_meters: Joi.forbidden()
    .messages({ 'any.unknown': 'remaining_quantity_meters is system-managed. Use Usage Logging or Stock Adjustments.' }),
  lot_code: Joi.forbidden()
    .messages({ 'any.unknown': 'lot_code is auto-generated and cannot be changed.' }),
});

module.exports = { createStockSchema, editStockSchema, STORAGE_LOCATIONS };
