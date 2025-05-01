const express = require('express');
const fs = require('fs');
const ini = require('ini');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = require('./routes');
const { sequelize, connectDB, logger, Live } = require('./configs');
const { Op, Sequelize } = require('sequelize');
const path = require('path');
const { success, error } = require('./utils');
require('dotenv').config();
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const port = parseInt(config.server.port);

connectDB() // there is no need to sync because explicitly define in sqls


// cleaner to this file


const app = express();
const Cors = cors({origin: `http://localhost:${port}`,})
app.use(Cors);
app.use(bodyParser.json());

app.use((req, res, next) => {
	logger.info(`Request: ${req.method}, ${req.url}`);
	next();
});

app.get('/api/v1/', (req, res) => {
	res.status(200).json(success(`Server is running on port ${port}`, undefined));
});


app.use('/api/v1/', router);

app.use((req, res, next) => {
	res.status(404).json(
		error('Route not found', 404)); // ,requestedUrl: req.originalUrl
});


app.use((err, req, res, next) => {
	logger.error(`Error: ${req.method}, ${req.url}: \n${err.message} \n`);
	res.status(500).json(error('Something went wrong!', 500));
});

async function liveCheck() {
	try {
		logger.info('Checking for expired live entries...');

		const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
		const expiredLives = await Live.findAll({ where: { reportTime: { [Op.lt]: twoMinutesAgo } } });

		if (expiredLives.length === 0)
			return;

		for (const live of expiredLives) {
			const imagePath = path.join(__dirname, `./screenshots/${live.liveUserId}.jpg`);
			if (fs.existsSync(imagePath))
				fs.unlinkSync(imagePath);

			// timestamp is so funcikng bad in nodejs. 
			await Live.destroy({ where: { liveUserId: live.liveUserId } });
		}

		logger.info(`Cleaned up ${expiredLives.length} expired live entries.`);
	} catch (error){
		logger.error('Error cleaning up expired live entries:', error);
	}
}

setInterval(liveCheck, 4 * 60 * 1000); // 4m

const server = app.listen(port, () => {
		console.log(`Server started on port ${port}`);
});

process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server');
	server.close(() => {
		console.log('HTTP server closed');
		// debug('HTTP server closed');
	});
});
