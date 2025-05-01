const jwt = require('jsonwebtoken');
const { error, success } = require('./utils');
const ini = require('ini');
const fs = require('fs');
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const userExpirationTime = config.server.userExpirationTime;
const expertExpirationTime = config.server.expertExpirationTime;
const JWTrecoveryTime = parseInt(config.server.JWTrecoveryTime);
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

async function authenticateToken(req, res, next) {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];

		if (!token) return res.status(401).json(error('Access token missing.', 401));

		const decoded = jwt.verify(token, JWT_SECRET);
		req.tUserId = decoded.telegram_id;
		// req.role = req.headers['x-role'];

		const currentTime = Math.floor(Date.now() / 1000);
		const timeLeft = Math.floor((decoded.exp - currentTime)/60); // time in minute
		req.timeLeft = timeLeft;
		if(timeLeft <= JWTrecoveryTime && req.role == "user"){
			const newToken = jwt.sign({ tUserId: decoded.tUserId }, JWT_SECRET, { expiresIn: userExpirationTime });
			req.token = newToken;
			res.setHeader('x-new-token', newToken);
			req.updateJWT = true;
		} else {
			req.updateJWT = false;
		}
		next();
	} catch (err) {
		return res.status(403).json(error('Invalid or expired token.', 403));
	}
}


async function newToken(req, res) {
	const newToken = jwt.sign({ tUserId: req.tUserId }, JWT_SECRET, { expiresIn: userExpirationTime });
	res.status(200).json(success('New token:', newToken));
}


async function newDevToken(req, res) {
	const name = req.query.name;
	const newToken = jwt.sign({ tUserId: name }, JWT_SECRET, { expiresIn: userExpirationTime });
	res.send(`Bearer ${newToken}`);
}

/*
async function partialAccess(req, res, next){
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if(token){
		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			req.userName = decoded.userName;
			req.role = req.headers['x-role'];

			const currentTime = Math.floor(Date.now() / 1000);
			const timeLeft = Math.floor((decoded.exp - currentTime)/60); // time in minute
			req.timeLeft = timeLeft;
			if(timeLeft <= JWTrecoveryTime && req.role == "user"){
				const newToken = jwt.sign({ userName: decoded.userName }, JWT_SECRET, { expiresIn: userExpirationTime });
				req.token = newToken;
				res.setHeader('x-new-token', newToken);
				req.updateJWT = true;
			} else {
				req.updateJWT = false;
			}
			req.partialAccess = false;
			next();
		} catch (err) {
			return res.status(403).json(error('Invalid or expired token.', 403));
		}
	} else {
		req.partialAccess = true;
		next();
	}
}
*/

module.exports = { authenticateToken, newDevToken, newToken, }; // partialAccess
