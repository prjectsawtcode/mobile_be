const Joi = require('joi');

exports.updateProfile = Joi.object({
  name: Joi.string().min(2).max(50),
  email: Joi.string().email().allow('', null),
  address: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
  date_of_birth: Joi.date().allow('', null),
  bio: Joi.string().max(500).allow('', null),
  mosque_affiliation: Joi.string().allow('', null),
});

exports.updateRole = Joi.object({
  role: Joi.string().valid('user', 'admin', 'scholar').required(),
});
