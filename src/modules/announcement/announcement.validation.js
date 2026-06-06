const Joi = require('joi');

exports.create = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  content: Joi.string().max(5000).required(),
  image_url: Joi.string().uri().allow('', null),
  voice_url: Joi.string().uri().allow('', null),
  category: Joi.string().required(),
  privacy: Joi.string().valid('everyone', 'masjid').default('everyone'),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).allow(null),
});

exports.update = Joi.object({
  title: Joi.string().min(5).max(200),
  content: Joi.string().max(5000),
  image_url: Joi.string().uri().allow('', null),
  voice_url: Joi.string().uri().allow('', null),
  category: Joi.string(),
  privacy: Joi.string().valid('everyone', 'masjid'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().allow(null),
});
