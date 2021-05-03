import { Router } from 'express';
import { Users } from '../entities/Users';
import { getConnection } from 'typeorm';
import { auth, catchAsync } from '../middleware';

const router = Router();

router.post('/score', auth, catchAsync(async (req, res) => {
    const user = await Users.findOne({ where: { id: req.session.userId } });
    const { score } = req.body;
    if (!user?.highscore || +score > user.highscore) {
        await getConnection()
            .createQueryBuilder()
            .update(Users)
            .set({ highscore: +score })
            .where("id = :id", { id:req.session.userId })
            .execute();
    }
    res.json({ message: 'OK' });
}));

router.get('/score', catchAsync(async (_req, res) => {
    const topScores = await Users.createQueryBuilder()
        .select("username AS user, highscore AS score")
        .orderBy('highscore', 'DESC')
        .limit(20)
        .getRawMany();
    res.json(topScores);
}));

export default router;