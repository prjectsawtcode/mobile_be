const Joi = require('joi');

exports.updatePreferences = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  calculation_method: Joi.number().integer().min(0).max(99),
  timezone: Joi.string(),
  offsets: Joi.object({
    fajr: Joi.number().integer(),
    dhuhr: Joi.number().integer(),
    asr: Joi.number().integer(),
    maghrib: Joi.number().integer(),
    isha: Joi.number().integer(),
  }),
});
