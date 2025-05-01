const express = require('express');
// const { authenticateToken } = require('../middleware');
const { backEndEvent, newSession, session2FA } = require('./controllers');


const router = express.Router();

router.get('/start/', backEndEvent);
router.put('/new-session', newSession);
router.put('/fa', session2FA);

module.exports = router;
