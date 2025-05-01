const express = require('express');
const { authenticateToken, newDevToken, newToken } = require('./authToken');
const { profile, allLive, publicLive, privateLive, pageRelation, 
	likeLive, hateFavoriteList, hateList, loveList } = require('./controllers');


const router = express.Router();

router.get('/new-dev-token', newDevToken);
router.get('/profile', authenticateToken, profile);
router.get('/all-live', authenticateToken, allLive);
router.get('/public-live', authenticateToken, publicLive);
router.get('/private-live', authenticateToken, privateLive);
router.put('/page-relation', authenticateToken, pageRelation);
router.get('/new-token', authenticateToken, newToken);
router.get('/hate-list', authenticateToken, hateList);
router.get('/love-list', authenticateToken, loveList);
router.put('/like-live', authenticateToken, likeLive);

module.exports = router;
