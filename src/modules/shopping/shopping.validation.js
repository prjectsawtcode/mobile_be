const Joi = require('joi');

exports.create = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(5000).allow('', null),
  price: Joi.number().min(0).required(),
  category: Joi.string().max(100).required(),
  provider_name: Joi.string().max(200).required(),
  whatsapp_number: Joi.string().max(20).required(),
  logo_url: Joi.string().uri().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  about: Joi.string().max(2000).allow('', null),
});

exports.update = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(5000).allow('', null),
  price: Joi.number().min(0),
  category: Joi.string().max(100),
  provider_name: Joi.string().max(200),
  whatsapp_number: Joi.string().max(20),
  logo_url: Joi.string().uri().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  about: Joi.string().max(2000).allow('', null),
  is_active: Joi.number().valid(0, 1),
});
