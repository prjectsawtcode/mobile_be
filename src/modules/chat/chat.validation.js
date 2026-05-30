const Joi = require('joi');

const supportedLanguages = ['English', 'Byari', 'Manglish', 'Kanglish', 'Urdu', 'Hindi', 'Tamil', 'Arabic', 'Malayalam', 'Kannada'];

exports.createRoom = Joi.object({
  scholar_id: Joi.string().uuid().required(),
  language: Joi.string().valid(...supportedLanguages).required(),
});

exports.sendMessage = Joi.object({
  content: Joi.string().max(2000).when('content_type', { is: 'text', then: Joi.required(), otherwise: Joi.allow('', null) }),
  content_type: Joi.string().valid('text', 'voice', 'image').default('text'),
});
