const Joi = require('joi');

const supportedLanguages = ['English', 'Byari', 'Manglish', 'Kanglish', 'Urdu', 'Hindi', 'Tamil', 'Arabic', 'Malayalam', 'Kannada'];

exports.create = Joi.object({
  scholar_id: Joi.string().uuid().required(),
  question: Joi.string().max(2000).required(),
  answer: Joi.string().max(10000).required(),
  language: Joi.string().valid(...supportedLanguages).required(),
  category: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).default([]),
});

exports.update = Joi.object({
  question: Joi.string().max(2000),
  answer: Joi.string().max(10000),
  language: Joi.string().valid(...supportedLanguages),
  category: Joi.string(),
  tags: Joi.array().items(Joi.string()),
});
