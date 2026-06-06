const Joi = require('joi');

exports.createRequest = Joi.object({
  katha_number: Joi.string().required(),
  member_name: Joi.string().min(2).max(100).required(),
  payment_type: Joi.string().required(),
  amount: Joi.number().positive().required(),
  month: Joi.string().required(),
  upi_id: Joi.string().allow('', null),
  screenshot_url: Joi.string().uri({ allowRelative: true }).allow('', null),
  utr: Joi.string().allow('', null),
});

exports.updateStatus = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  remark: Joi.string().max(500).allow('', null),
});

exports.updateSettings = Joi.object({
  masjid_name: Joi.string().max(200),
  qr_code_url: Joi.string().uri().allow('', null),
  upi_id: Joi.string().allow('', null),
  account_number: Joi.string().allow('', null),
  ifsc_code: Joi.string().allow('', null),
  bank_name: Joi.string().allow('', null),
  account_holder: Joi.string().allow('', null),
});
