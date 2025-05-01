// function biasedRandom(maxValue, center) {
// 	const biasFactor = 1.7; // Higher values create stronger clustering
// 	const base = Math.random() ** biasFactor;
// 	const rand = Math.round(base * maxValue);
// 	// Shift towards center by adjusting probability distribution
// 	let ans = rand < center ? center - (center - rand) : rand;
// 	return ans + 1;
// }

// let a = {};
// let b = 0;
// for(let i=0; i<100000; i++){
// 	b = biasedRandom(10, 3);
// 	if(a[b])
// 		a[b] = a[b] + 1;
// 	else
// 		a[b] = 1;
// }
// // Example usage
// console.log(a);
const { sequelize, sequelizeLive, Report, Relationship, OurUser, IgSession, Live, logger } = require('./configs');
const { Op } = require('sequelize');
const { fork } = require('child_process');
const util = require('util');


async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}

async function hi (){
	for(let i=0; i<5; i++){
		logger.info(`Hiiiiii${i}`);
		new Promise((resolve, reject) => {
			const child = fork('./instagram/session_builder.js');
			child.send(i);
			child.on('message', (message) => {
				// reqular log work
				// console.log(message);

				// logger.info(`Parent received message:`, message);
				// its wierd above not work but two blow work
				logger.info(`Parent received: ${util.inspect(message, { depth: null })}`);
				// logger.info(`Parent received: ${JSON.stringify(message, null, 2)}`);
				resolve(); // Resolve when the child process sends a message
			});

			// Handle errors in the child process
			child.on('error', (err) => {
				logger.error(`Child process error:`, err);
				reject(err);
			});

			// Handle child exit (if needed)
			child.on('exit', (code) => {
				logger.info(`Child process exited with code ${code}`);
				if (code !== 0) reject(new Error(`Child process exited with code ${code}`));
			});
		});
	}
}

// hi();

async function hello() {
	logger.info(`Hiiiiii`);
	new Promise((resolve, reject) => {
		const child = fork('./instagram/test.js');
		child.send({"hi": 7});
		child.on('message', (message) => {
			logger.info(`Parent received: ${util.inspect(message, { depth: null })}`);
			resolve(); // Resolve when the child process sends a message
		});

		child.on('error', (err) => {
			logger.error(`Child process error:`, err);
			reject(err);
		});

		child.on('exit', (code) => {
			logger.info(`Child process exited with code ${code}`);
			if (code !== 0) reject(new Error(`Child process exited with code ${code}`));
		});
	});
}

// hello();

async function tes() {
	return new Promise((resolve, reject) => {
		process.once('message', async (msg) => {
			console.log(2);
			console.log(msg);
			reject(new Error('h'));
			console.log(10);
		});
	}); 
}

process.on('message', async (m) => {
	if (m.t == 1){
		try {
			console.log(1);
			await sleep(2);
			throw new Error('W');
		} catch(e) {
			process.send({ requestCode: true, e: 1 });
		}
	} else if(m.t == 2){
		console.log(2);
		await sleep(2);
		process.send({ requestCode: true, e: 2 });
	} else if (m.t == 3) {
		console.log(3);
		await sleep(2);
		process.send({ requestCode: true, e: 3 });
	} else{
		console.log(4);
		await sleep(2);
		process.send({ requestCode: true, e: 4 });
	}
	// process.send({ finish: true });
	// process.exit();
});

