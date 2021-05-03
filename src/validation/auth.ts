import Joi from "@hapi/joi";

const email = Joi.string().email().min(8).max(254).lowercase().trim().required();
const username = Joi.string().min(3).max(128).trim().required();
const password = Joi.string().min(8).max(72, 'utf8').required(); // 72 bytes is max of bcrypt
const passwordConfirmation = Joi.valid(Joi.ref('password')).required();

export const registerSchema = Joi.object({
    email,
    username,
    password,
    passwordConfirmation
});

export const loginSchema = Joi.object({
    email,
    password
});