const Joi = require('joi');

exports.create = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(5000).allow('', null).optional(),
  price: Joi.number().min(0).optional().default(0),
  category: Joi.string().max(100).optional().default('GENERAL'),
  provider_name: Joi.string().max(200).optional().default('Vendor'),
  whatsapp_number: Joi.string().max(20).optional(),
  whatsapp_phone: Joi.string().max(20).optional(),
  logo_url: Joi.string().allow('', null).optional(),
  image_url: Joi.string().allow('', null).optional(),
  imageUrl: Joi.string().allow('', null).optional(),
  about: Joi.string().max(2000).allow('', null).optional(),
}).unknown(true);

exports.update = Joi.object({
  name: Joi.string().min(1).max(200),
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(5000).allow('', null),
  price: Joi.number().min(0),
  category: Joi.string().max(100),
  provider_name: Joi.string().max(200),
  whatsapp_number: Joi.string().max(20),
  whatsapp_phone: Joi.string().max(20),
  logo_url: Joi.string().allow('', null),
  image_url: Joi.string().allow('', null),
  imageUrl: Joi.string().allow('', null),
  about: Joi.string().max(2000).allow('', null),
  is_active: Joi.number().valid(0, 1),
}).unknown(true);
