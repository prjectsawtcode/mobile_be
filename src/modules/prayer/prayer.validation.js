const Joi = require('joi');

exports.preferences = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  calculation_method: Joi.number().integer().default(1),
  timezone: Joi.string().default('Asia/Kolkata'),
  offsets: Joi.object({
    fajr: Joi.number().default(0),
    dhuhr: Joi.number().default(0),
    asr: Joi.number().default(0),
    maghrib: Joi.number().default(0),
    isha: Joi.number().default(0),
  }).default(),
});
