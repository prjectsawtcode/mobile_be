const Joi = require('joi');

exports.create = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  content: Joi.string().max(5000).required(),
  image_url: Joi.string().allow('', null),
  imageUrl: Joi.string().allow('', null),
  voice_url: Joi.string().allow('', null),
  voiceUrl: Joi.string().allow('', null),
  category: Joi.string().required(),
  privacy: Joi.string().valid('everyone', 'masjid', 'PUBLIC', 'public', 'EVERYONE').default('everyone'),
  masjid: Joi.string().allow('', null),
  hasVoiceNote: Joi.boolean().optional(),
  voiceDuration: Joi.string().allow('', null),
  start_date: Joi.date().iso().optional().default(() => new Date().toISOString()),
  end_date: Joi.date().iso().allow(null).optional(),
}).unknown(true);

exports.update = Joi.object({
  title: Joi.string().min(2).max(200),
  content: Joi.string().max(5000),
  image_url: Joi.string().allow('', null),
  imageUrl: Joi.string().allow('', null),
  voice_url: Joi.string().allow('', null),
  voiceUrl: Joi.string().allow('', null),
  category: Joi.string(),
  privacy: Joi.string().valid('everyone', 'masjid', 'PUBLIC', 'public', 'EVERYONE'),
  masjid: Joi.string().allow('', null),
  hasVoiceNote: Joi.boolean().optional(),
  voiceDuration: Joi.string().allow('', null),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().allow(null),
}).unknown(true);
