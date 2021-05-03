import 'reflect-metadata';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';
import session from 'express-session';
import { REDIS_OPTIONS, APP_PORT } from './config';
import { createApp } from './app'
import { createConnection } from "typeorm";

const main = async () => {

    const RedisStore = connectRedis(session);

    const client = new Redis(REDIS_OPTIONS);

    const store = new RedisStore({ client });

    const app = createApp(store);

    const conn = await createConnection();
    conn.runMigrations();

    app.listen(APP_PORT, () => {
        console.log("Server running on port " + APP_PORT);
    });
};

main();