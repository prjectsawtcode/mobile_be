const Joi = require('joi');

exports.updateFcmToken = Joi.object({
  fcm_token: Joi.string().required(),
});
