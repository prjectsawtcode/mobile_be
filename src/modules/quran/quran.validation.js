const Joi = require('joi');

exports.search = Joi.object({
  q: Joi.string().min(2).required(),
  translation: Joi.string().valid('en', 'ml', 'ur', 'hi', 'ta', 'kn').default('en'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

exports.bookmark = Joi.object({
  surah_id: Joi.number().integer().required(),
  verse_number: Joi.number().integer().required(),
});
