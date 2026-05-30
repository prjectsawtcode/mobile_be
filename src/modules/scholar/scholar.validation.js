const Joi = require('joi');

exports.updateSchedule = Joi.object({
  schedules: Joi.array().items(
    Joi.object({
      day_of_week: Joi.number().integer().min(0).max(6).required(),
      start_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      end_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      timezone: Joi.string().default('Asia/Kolkata'),
    })
  ).required(),
});

exports.updateStatus = Joi.object({
  status: Joi.string().valid('available', 'busy', 'offline').required(),
});
