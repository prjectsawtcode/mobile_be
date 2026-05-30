const Joi = require('joi');

const phone = Joi.string().pattern(/^[6-9]\d{9}$/).required();
const password = Joi.string().min(8).pattern(/(?=.*[A-Z])(?=.*\d)/).required();

exports.register = Joi.object({
  phone,
  password,
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().allow('', null),
  gender: Joi.string().valid('male', 'female').required(),
});

exports.verifyOtp = Joi.object({
  phone,
  otp: Joi.string().length(6).required(),
});

exports.login = Joi.object({
  phone,
  password,
  fcm_token: Joi.string().allow('', null),
});

exports.refresh = Joi.object({
  refresh_token: Joi.string().uuid().required(),
});

exports.forgotPassword = Joi.object({
  phone,
});

exports.resetPassword = Joi.object({
  phone,
  otp: Joi.string().length(6).required(),
  password,
});
