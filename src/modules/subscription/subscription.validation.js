const Joi = require('joi');

exports.purchase = Joi.object({
  plan_id: Joi.number().integer().required(),
  gateway: Joi.string().valid('upi', 'phonepe', 'googlepay').default('upi'),
});
