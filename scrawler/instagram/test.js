const { sequelize, connectDB, Report, Relationship, OurUser, IgSession, Live } = require(process.cwd() + "/configs");
const logger = require(process.cwd() + "/instagram/logger"); //?
const fs = require('fs');
const path = require('path');
const { IgApiClient } = require('instagram-private-api');

// connectDB();

async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}
process.on('uncaughtException', (err) => {
	process.send({ error: err.message, code: 1 });
	process.exit(1); // Ensure the worker exits on error
});

process.on('message', async (item) => {
	console.log("D: ", process.cwd());
	logger.info("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
	logger.error("hi");
	logger.end();
	await sleep(1);
	fs.writeFileSync(process.cwd() + '/instagram/sessions/haha.txt', "hiiiiiiiiiiiii");
	process.send({"a": 5});
	process.exit();
});
