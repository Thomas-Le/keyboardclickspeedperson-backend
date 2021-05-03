import { Router } from 'express';
import { Users } from '../entities/Users';
import { validate, registerSchema } from '../validation';
import { logIn } from '../auth';
import { catchAsync, guest } from '../middleware';
import { BadRequest } from '../errors';
import * as bcrypt from 'bcrypt';

const router = Router();

router.post('/register', guest, catchAsync(async (req, res) => {
    await validate(registerSchema, req.body);

    const { email, username, password } = req.body;
    const emailFound = await Users.findOne({ where: { email: email }});
    const usernameFound = await Users.findOne({ where: { username: username }});

    if (emailFound) {
        throw new BadRequest('Please try another email');
    } else if (usernameFound) {
        throw new BadRequest('Please try another username');
    }
    bcrypt.hash(password, 12, async (err, hash) => {
        if (err) {
            console.log(err);
        }
        const user = await Users.createQueryBuilder().insert().values({ email: email, username: username, hashedPassword: hash }).execute();
        logIn(req, user.identifiers[0].id.toString());
        res.json({ message: 'OK' });
    });
}));

export default router;