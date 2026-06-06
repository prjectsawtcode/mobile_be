const Joi = require('joi');

exports.create = Joi.object({
  scholar_id: Joi.string().uuid().required(),
  question: Joi.string().max(2000).required(),
  answer: Joi.string().max(10000).required(),
  language: Joi.string().required(),
  category: Joi.string().allow('', null),
  tags: Joi.array().items(Joi.string()).allow(null),
});

exports.update = Joi.object({
  question: Joi.string().max(2000),
  answer: Joi.string().max(10000),
  language: Joi.string(),
  category: Joi.string().allow('', null),
  tags: Joi.array().items(Joi.string()).allow(null),
});
