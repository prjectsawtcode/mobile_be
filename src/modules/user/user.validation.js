const Joi = require('joi');

exports.updateMe = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email().allow('', null),
  bio: Joi.string().max(500).allow('', null),
  city: Joi.string().max(100).allow('', null),
  state: Joi.string().max(100).allow('', null),
  address: Joi.string().max(500).allow('', null),
  date_of_birth: Joi.date().iso().allow('', null),
  mosque_affiliation: Joi.string().max(255).allow('', null),
  avatar_url: Joi.string().max(1000).allow('', null),
});


exports.updateRole = Joi.object({
  role: Joi.string().valid('user', 'admin', 'scholar').required(),
});
