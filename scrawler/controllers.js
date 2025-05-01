const { success, error } = require('./utils');
const { sequelize, Report, Relationship, OurUser, IgSession, Live, logger } = require('./configs');
const { Sequelize, Op } = require('sequelize');
const { fork } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}

function biasedRandom(maxValue, center) {
	const biasFactor = 1.7; // Higher values create stronger clustering
	const base = Math.random() ** biasFactor;
	const rand = Math.round(base * maxValue);
	// Shift towards center by adjusting probability distribution
	let ans = rand < center ? center - (center - rand) : rand;
	return ans + 1;
}

async function backEndEvent(req, res) {
	// updatedLives = [...Array(5).keys()];
	const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
	let updatedLives = await IgSession.update({ lastReport: Sequelize.literal('CURRENT_TIMESTAMP'), sessionState: 2 },
		{ 
			where: { lastReport: { [Op.lt]: twoMinutesAgo }, sessionState: 1 },
			returning: true // Ensures updated rows are returned
		}
	);
	updatedLives = updatedLives[1];

	if(!updatedLives.length)
		res.status(200).json(success("No active session exist.", {}));
	else {
		res.status(200).json({ message: 'OK', count: updatedLives.length });
		processItems(updatedLives);
	}
};


async function processItems(itemsArray) {
	while (itemsArray.length > 0) {
		let simSleep = biasedRandom(7, 3); // return random number between 1, 8
		await sleep(simSleep);

		let item = itemsArray.shift();
		logger.info(`Processing item: ${item.igUserId}, ${item.igUserName}`);
		processItem(item);
	}
}

async function processItem(item) {
	return new Promise((resolve, reject) => {
		try{
			const child = fork('./instagram/worker.js');
			IgSession.update({ sessionState: 3, lastReport: new Date() },{
				where: { igUserId: item.igUserId }
			}).then(async() => { 
				await sleep(0.5);
				child.send(item); 
			});

			child.on('message', async (message) => {
				// logger.info(`Child process finished for item ${item}:`, message);
				if(message.code == 1){
					if(item.errorCounter == 1){
						await IgSession.update({ errorCounter: 2, sessionState: 4, lastReport: new Date() }, {
							where: { igUserId: item.igUserId } });
					} else {
						await IgSession.update({ errorCounter: item.errorCounter + 1, sessionState: 1, lastReport: new Date() }, {
							where: { igUserId: item.igUserId } });
					}
				} else {
					handleReports(item);
				}
				resolve(message);
			});

			child.on('exit', async (code, signal) => {
				// siganl means program exited with a sigkill or ... siganl.
				// logger.info(`Worker exited for item ${item}`)
				if (code == 0){
					await IgSession.update({ sessionState: 1, lastReport: new Date() }, {
						where: { igUserId: item.igUserId }
					});
				}
			});

			child.on('error', async (err) => {
				// connection to database error
				reject(err);
			});
		} catch (error) {
			logger.error(`Error processing item ${item.igUserId}:`, error);
		}
	});
}

async function handleReports(item){
	const reports = await Report.findAll({ where: { igUserId: item.igUserId } });

	if (reports.length === 0) {
		logger.info(`No reports found for igUserId: ${item.igUserId}`);
		return;
	}

	for (const report of reports) {
		const existingLive = await Live.findOne({ where: { liveUserId: report.liveUserId } });

		// change screenshot path (absolote to local)
		if (!existingLive) {
			const screenshotPath = await takeScreenshot(report.dashPlaybackUrl, report.liveUserId, report.height, report.width);
			await Live.create({
				liveUserId: report.liveUserId,
				reportTime: report.reportTime,
				liveBroadcastId: report.liveBroadcastId,
				igUserId: report.igUserId,
				liveUserName: report.liveUserName,
				liveFullName: report.liveFullName,
				liveIsPrivate: report.liveIsPrivate,
				friendshipStatusIsPrivate: report.friendshipStatusIsPrivate,
				profilePicAddress: report.profilePicUrl,
				coverFrameAddress: screenshotPath,
				dashPlaybackAddress: screenshotPath,
				dashAbrPlaybackAddress: report.dashAbrPlaybackUrl,
				viewerCount: report.viewerCount,
				likeCount: 0
			});
		} else {
			if (report.reportTime > existingLive.reportTime) {
				const screenshotPath = await takeScreenshot(report.dashPlaybackUrl, report.liveUserId, report.height, report.width);
				await existingLive.update({ reportTime: report.reportTime, coverFrameAddress: screenshotPath });
			}
		}

		await Report.destroy({ where: { liveUserId: report.liveUserId, reportTime: report.reportTime }});
	}

	logger.info(`Processed ${reports.length} reports for igUserId: ${item.igUserId}`);
}


async function takeScreenshot(videoUrl, liveUserId, width, height) {
	return new Promise((resolve, reject) => {
		const outputPath = path.join(__dirname, `./screenshots/${liveUserId}.jpg`);

		ffmpeg(videoUrl)
			.outputOptions([
				'-vf', `scale=${width}:${height}`,
				'-vframes', '1',           // Extract only one frame
				'-q:v', '2'                // Set quality (lower is better)
			])
			.save(outputPath)
			.on('end', () => {
				logger.info(`Screenshot saved: ${outputPath}`);
				resolve(`${liveUserId}.jpg`);
			})
			.on('error', (err) => {
				logger.error(`Error taking screenshot for ${videoUrl}:`, err);
				reject(err);
			});
	});
}


async function newSession(req, res) {
	let { igUserName, igPassword } = req.body;
	if (!igUserName || !igPassword)
		return res.status(404).json(error("Missing parameter.", 404));

	const child = fork('./instagram/session_builder.js');
	await sleep(0.25);
	child.send({ userName: igUserName, password: igPassword });

	child.on('message', async (message) => {
		// console.log(`Child process finished for item:`, message);
		if(message.error || message.code){
			if (message.code == 1) {
				res.status(400).json(error("UserName or Password is wrong.", 400));
			} else if (message.code == 2){
				res.status(406).json(error("Unhandled error. Please try again.", 406));
			}
		} else if (message.ig_id) {
			let temp = await IgSession.findOne({ where: { igUserId: message.ig_id } });
			if(temp){
				temp = await IgSession.update({ igUserName: message.userName, igPassword: message.password, 
					sessionState: 1, fileAddress: `${message.ig_id}.json`, lastReport: new Date(), errorCounter: 0},
					{ where: { igUserId: message.ig_id } });
				res.status(200).json(success("Session updated successfully.", temp));
			} else {
				temp = await IgSession.create({ igUserId: message.ig_id, igUserName: message.userName,
					igPassword: message.password, sessionState: 1, fileAddress: `${message.ig_id}.json`,
					lastReport: new Date(), errorCounter: 0 });
				res.status(201).json(success("Session created successfully.", temp));
			}
		}
	});

	child.on('error', async (err) => {
		logger.error("Session_bulder: Unhandled error:", err);
	})

	child.on('exit', async (code, signal) => {
		if (code == 0){
			logger.info('New session created successfully.');
		} else
			logger.error('New session encounter some error.');
	});

}

module.exports = {
	backEndEvent,
	newSession,
}


// function processItems(itemsArray) {
//  if (itemsArray.length === 0) return;
//  const processNext = () => {
//    if (itemsArray.length === 0) return;
//    const item = itemsArray.shift(); // Remove first item from array
//    console.log(`Processing item: ${item}`);
//    // Fork a separate Node.js process to handle this item
//    const child = fork('./worker.js'); 
//    child.send(item); // Send data to worker process
//    child.on('message', (message) => {
//      console.log(`Child process finished for item ${item}:`, message);
//    });
//    processNext(); // Process next item
//  };
//  processNext();
// };
