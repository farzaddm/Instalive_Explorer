const bodyParser = require('body-parser');
const { Sequelize, Op } = require('sequelize');
const { sequelize, connectDB, logger, Report, Relationship, OurUser, IgSession, Live } = require('./configs');
const fs = require('fs');
const path = require('path');

connectDB()
// setInterval(checkUserSubscriptions, 12 * 60 * 60 * 1000); // 12h
setInterval(liveCheck, 4 * 60 * 1000); // 4m
// setInterval(accountProblems, 13 * 60 * 1000); // 13m 

async function checkUserSubscriptions() {
	try {
		logger.info('Checking user subscriptions...');

		const expiredUsers = await OurUser.findAll({ where: { userStatus: 1, // 1 means active subscription
				paidTime: { [Op.lt]: Sequelize.literal(`NOW() - INTERVAL '1 DAY' * payment_status`) } }
				// Sequelize.literal(`paid_time + INTERVAL '1 DAY' * payment_status < NOW()`) }
		});
		// const users = await OurUser.findAll({ where: { userStatus: 1 } });
		// const now = new Date();
		// const expiredUsers = users.filter(user => {
		// 	const expiryDate = new Date(user.paidTime);
		// 	expiryDate.setDate(expiryDate.getDate() + user.paymentStatus);
		// 	return now > expiryDate;
		// });
		for (const user of expiredUsers) {
			await fetch(`http://91.107.142.37:5000/expire/${user.tUserId}`);
			await OurUser.update({ userStatus: 0 }, { where: { tUserId: user.tUserId } });
			// await IgSession.update( { sessionState: 0 }, { where: { igUserId: user.igUserId } } );
		}

		logger.info(`Subscription check complete. ${expiredUsers.length} users updated.`);
	} catch (error){
		logger.error('Error checking subscriptions:', error);
	}
}

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

async function accountProblems() {
	try {
		logger.info('Checking for error sessions...');

		const sessions = await IgSession.findAll({ where: { [Op.or]: [ { errorCounter: 2 }, { sessionState: 4 } ] } });

		if (sessions.length === 0)
			return;

		for (const session of sessions) {
			const user = await OurUser.findOne({ where: { igUserId: session.igUserId } });

			if (!user) {
				console.warn(`No user found for igUserId: ${session.igUserId}`);
				continue;
			}
			await OurUser.update({ igStatus: 1 }, { where: { tUserId: user.tUserId } });
			await fetch(`http://91.107.142.37:5000/problem/${user.tUserId}`);
		}

		logger.info(`Processed ${sessions.length} error sessions.`);
	} catch (error){
		logger.error('Error processing error sessions:', error);
	}
}

// maybe session check (handled in controller but it can be a more secure way)

process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server');
});
