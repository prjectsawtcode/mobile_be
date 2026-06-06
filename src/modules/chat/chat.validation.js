const Joi = require('joi');

exports.createRoom = Joi.object({
  scholar_id: Joi.string().uuid().required(),
  language: Joi.string().valid('English', 'Byari', 'Manglish', 'Kanglish', 'Urdu', 'Hindi', 'Tamil', 'Arabic', 'Malayalam', 'Kannada').required(),
});

exports.sendMessage = Joi.object({
  content: Joi.string().max(2000).required(),
  content_type: Joi.string().valid('text', 'voice', 'image').default('text'),
});
