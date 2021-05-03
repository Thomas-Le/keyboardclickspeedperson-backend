import { Router } from 'express';
import { Users } from '../entities/Users';
import { auth, catchAsync, guest } from '../middleware';
import { validate, loginSchema } from '../validation';
import { Unauthorized } from '../errors';
import { logIn, logOut } from '../auth';
import * as bcrypt from 'bcrypt';

const router = Router();

router.post('/login', guest, catchAsync(async (req, res) => {
    await validate(loginSchema, req.body);

    const { email, password } = req.body;

    const user = await Users.findOne({ where: { email: email } });

    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
        throw new Unauthorized('Incorrect email or password');
    }

    logIn(req, user.id.toString());

    res.json({ message: 'OK' });
}));

router.post('/logout', auth, catchAsync(async (req, res) => {
    await logOut(req, res);

    res.json({ message: 'OK' });
}));

router.get('/login', catchAsync(async (req, res) => {
    res.json({ message: !!req.session.userId });
}));

export default router;