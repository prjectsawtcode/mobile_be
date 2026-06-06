const Joi = require('joi');

exports.createCategory = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  logo_url: Joi.string().uri().allow('', null),
  sort_order: Joi.number().integer().min(0).default(0),
});

exports.updateCategory = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500).allow('', null),
  logo_url: Joi.string().uri().allow('', null),
  sort_order: Joi.number().integer().min(0),
  is_active: Joi.number().valid(0, 1),
});

exports.createMenuItem = Joi.object({
  category_id: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).allow('', null),
  price: Joi.number().min(0).required(),
  subcategory: Joi.string().max(100).allow('', null),
  image_url: Joi.string().uri().allow('', null),
  whatsapp_number: Joi.string().max(20).allow('', null),
  is_available: Joi.number().valid(0, 1).default(1),
});

exports.updateMenuItem = Joi.object({
  category_id: Joi.string().uuid(),
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(2000).allow('', null),
  price: Joi.number().min(0),
  subcategory: Joi.string().max(100).allow('', null),
  image_url: Joi.string().uri().allow('', null),
  whatsapp_number: Joi.string().max(20).allow('', null),
  is_available: Joi.number().valid(0, 1),
  is_active: Joi.number().valid(0, 1),
});
