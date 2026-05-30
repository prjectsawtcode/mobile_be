const Joi = require('joi');

exports.fcmToken = Joi.object({
  fcm_token: Joi.string().min(1).required(),
});
