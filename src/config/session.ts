import { SessionOptions } from 'express-session';
import { PROD } from './app';

const ONE_HOUR = 1000 * 60 * 60;

export const {
    SESSION_SECRET = "secret",
    SESSION_NAME = 'sid',
    SESSION_IDLE_TIMEOUT = ONE_HOUR
} = process.env

export const SESSION_OPTIONS: SessionOptions = {
    secret: SESSION_SECRET,
    name: SESSION_NAME,
    cookie: {
        maxAge: +SESSION_IDLE_TIMEOUT,
        secure: PROD,
        sameSite: true
    },
    rolling: true,
    resave: false,
    saveUninitialized: false
}