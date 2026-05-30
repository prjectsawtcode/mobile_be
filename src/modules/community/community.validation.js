const Joi = require('joi');

exports.createPost = Joi.object({
  content: Joi.string().max(2000).required(),
  image_url: Joi.string().uri().allow('', null),
});

exports.addComment = Joi.object({
  content: Joi.string().max(1000).required(),
});
