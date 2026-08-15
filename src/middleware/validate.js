import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = {};
  for (const err of result.array()) {
    if (!details[err.path]) details[err.path] = err.msg;
  }

  next(new ApiError(400, 'Validation failed', details));
};
