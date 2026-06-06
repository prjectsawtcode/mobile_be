const Joi = require('joi');

exports.create = Joi.object({
  provider_name: Joi.string().max(200).required(),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(5000).allow('', null),
  price: Joi.number().min(0).required(),
  duration: Joi.string().max(50).allow('', null),
  category: Joi.string().valid('Umrah', 'Hajj', 'Ziyarat', 'Other').default('Umrah'),
  contact_whatsapp: Joi.string().max(20).allow('', null),
  website: Joi.string().max(200).allow('', null),
  image_url: Joi.string().uri().allow('', null),
  logo_url: Joi.string().uri().allow('', null),
  about: Joi.string().max(2000).allow('', null),
  total_slots: Joi.number().integer().min(0).default(0),
  booked_slots: Joi.number().integer().min(0).default(0),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
});

exports.update = Joi.object({
  provider_name: Joi.string().max(200),
  title: Joi.string().min(3).max(200),
  description: Joi.string().max(5000).allow('', null),
  price: Joi.number().min(0),
  duration: Joi.string().max(50).allow('', null),
  category: Joi.string().valid('Umrah', 'Hajj', 'Ziyarat', 'Other'),
  contact_whatsapp: Joi.string().max(20).allow('', null),
  website: Joi.string().max(200).allow('', null),
  image_url: Joi.string().uri().allow('', null),
  logo_url: Joi.string().uri().allow('', null),
  about: Joi.string().max(2000).allow('', null),
  total_slots: Joi.number().integer().min(0),
  booked_slots: Joi.number().integer().min(0),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
  is_active: Joi.number().valid(0, 1),
});
