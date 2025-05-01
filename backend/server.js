const express = require('express');
const fs = require('fs');
const ini = require('ini');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = require('./routes');
const { sequelize, connectDB, logger } = require('./configs');
const { success, error } = require('./utils');
require('dotenv').config();
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const port = parseInt(config.server.port);
// const { types } = require('pg'); // ----------------------

// types.setTypeParser(20, (val) => BigInt(val)); // ----------------------------
connectDB() // there is no need to sync because explicitly define in sqls

const app = express();
const Cors = cors({origin: `http://localhost:${port}`,})
app.use(Cors);
app.use(bodyParser.json());
app.use('/api/public', express.static(process.cwd() + '/../scrawler/screenshots')); // __dirname + '/public'

// app.use((req, res, next) => { // ----------------------------
// 	const originalJson = res.json;
// 	res.json = function(data) {
// 		const replacer = (key, value) =>
// 			typeof value === 'bigint' ? value.toString() : value;
// 		const jsonString = JSON.stringify(data, replacer);
// 		res.set('Content-Type', 'application/json');
// 		return res.send(jsonString);
// 	};
// 	next();
// });


app.use((req, res, next) => {
	let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
	logger.info(`Request: ${req.method}, ${req.url}, IP: ${ip}`);
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
