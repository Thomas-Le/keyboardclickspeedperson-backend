import { Router } from 'express';
import { Users } from '../entities/Users';
import { auth, catchAsync } from '../middleware';

const router = Router();

router.get('/home', auth, catchAsync(async (req, res) => {
    const user = await Users.findOne({ where: { id: req.session.userId } });
    res.json({ email: user?.email, username: user?.username });
}));

export default router;