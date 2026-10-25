import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Either a full connection string (Neon gives you one) or separate parts
  DATABASE_URL: Joi.string().uri(),
  DATABASE_HOST: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DATABASE_PASSWORD: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DATABASE_NAME: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DATABASE_SSL: Joi.boolean().default(false),

  ADMIN_API_KEY: Joi.string().min(32).required(),
  CORS_ORIGINS: Joi.string().required(),
  TRUST_PROXY: Joi.boolean().default(false),

  MAIL_FROM: Joi.string().required(),
  PAYMENT_DETAILS: Joi.string().required(),
}).prefs({ abortEarly:false})