import express from 'express';
import session, { Store } from 'express-session';
import { CORS_ORIGIN, SESSION_OPTIONS } from './config';
import { internalServerError, notFoundError } from './middleware';
import { home, login, register, score } from './routes';
import cors from 'cors';

export const createApp = (store: Store) => {
    const app = express();

    app.use(express.json());
    app.set('trust proxy', 1);

    app.use(cors({
        origin: CORS_ORIGIN,
        credentials: true
    }));

    app.use(session({
        ...SESSION_OPTIONS,
        store
    }));

    app.use(home);
    app.use(login);
    app.use(register);
    app.use(score);

    app.use(notFoundError);

    app.use(internalServerError);

    return app;
}