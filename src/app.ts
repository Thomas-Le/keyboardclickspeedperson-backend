import express from 'express';
import session, { Store } from 'express-session';
import { SESSION_OPTIONS } from './config';
import { internalServerError, notFoundError } from './middleware';
import { home, login, register, score } from './routes';
import cors from 'cors';

export const createApp = (store: Store) => {
    const app = express();

    app.use(express.json());

    app.use(cors({
        origin: "http://localhost:3000",
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