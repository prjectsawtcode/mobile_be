const Joi = require('joi');

exports.delete = Joi.object({
  id: Joi.string().uuid().required(),
});
