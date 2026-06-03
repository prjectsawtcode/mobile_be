const Joi = require('joi');

exports.register = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  password: Joi.string().min(8).pattern(/(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.pattern.base': 'Password must contain at least 1 uppercase letter and 1 number',
  }),
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().allow('', null),
  gender: Joi.string().valid('male', 'female').required(),
});

exports.verifyOtp = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  otp: Joi.string().length(6).required(),
});

exports.login = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  password: Joi.string().required(),
  fcm_token: Joi.string().allow('', null),
});

exports.refresh = Joi.object({
  refresh_token: Joi.string().uuid().required(),
});

exports.forgotPassword = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
});

exports.resetPassword = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  otp: Joi.string().length(6).required(),
  password: Joi.string().min(8).pattern(/(?=.*[A-Z])(?=.*\d)/).required(),
});
