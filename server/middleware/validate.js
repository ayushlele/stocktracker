const Joi = require('joi');

/**
 * Express middleware factory: validates req.body against a Joi schema.
 * Returns 400 with structured errors if validation fails.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    req.body = value; // Use cleaned/converted values
    next();
  };
}

module.exports = { validate };
