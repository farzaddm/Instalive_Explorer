const logger = require(process.cwd() + '/instagram/logger');
const fs = require('fs');
const path = require('path');
const { IgApiClient } = require('instagram-private-api');

async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}

process.on('uncaughtException', (err) => {
	process.send({ error: err.message, code: 2 });
	process.exit(1); // Ensure the worker exits on error
});

process.on('message', async (item) => {
	logger.info(`Session builder started for item: ${item}`);

	const ig = new IgApiClient();
	ig.state.generateDevice(item.userName);

	await ig.simulate.preLoginFlow();
	await sleep(1.7);
	let loggedInUser = undefined;
	try {
		loggedInUser = await ig.account.login(item.userName, item.password);
		const followersFeed = ig.feed.accountFollowers(loggedInUser.pk);
		const items = await followersFeed.items();
	} catch(e) {
		logger.info('Session encounter a problem:', e);
		process.send({ error: "Cannot login.", code: 1 });
		process.exit(1);
	}

	// try{
	// 	process.nextTick(async () => await ig.simulate.postLoginFlow());
	// } catch (error) {
	// 	console.log("Error: Instagram change API.");
	// }
	// await ig.simulate.postLoginFlow();

	fs.writeFileSync(process.cwd() + `/instagram/sessions/${loggedInUser.pk}.json`, JSON.stringify(await ig.state.serialize()));
	item.ig_id = loggedInUser.pk.toString();
	logger.info(`Logged in and session saved for item: ${item}`);
	process.send(item);
	await sleep(0.5);
	process.exit(0);
});
