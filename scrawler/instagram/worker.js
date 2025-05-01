const { sequelize, connectDB, Report, Relationship, OurUser, IgSession, Live } = require(process.cwd() + '/configs');
const logger = require(process.cwd() + '/instagram/logger');
const fs = require('fs');
const path = require('path');
const { IgApiClient } = require('instagram-private-api');

connectDB();

async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}
process.on('uncaughtException', (err) => {
	process.send({ error: err.message, code: 1 });
	process.exit(1); // Ensure the worker exits on error
});

process.on('message', async (item) => {
	logger.info(`Worker started for item: ${item}`);

	const ig = new IgApiClient();
	ig.state.generateDevice(item.userName);

	let loggedInUser = null;
	if (fs.existsSync(process.cwd() + `/instagram/sessions/${item.fileAddress}`)) { 
		const savedSession = JSON.parse(fs.readFileSync(process.cwd() + `/instagram/sessions/${item.fileAddress}`, 'utf-8'));
		await ig.state.deserialize(savedSession);
		try{
			loggedInUser = await ig.account.currentUser(); // verifies that the session is still valid
			// IgLoginRequiredError    
		} catch{
			await ig.simulate.preLoginFlow();
			loggedInUser = await ig.account.login(item.igUserName, item.igPassword);
		}
	} else {
		await ig.simulate.preLoginFlow();
		loggedInUser = await ig.account.login(item.igUserName, item.igPassword);
	}
	fs.writeFileSync(process.cwd() + `/instagram/sessions/${item.fileAddress}`, JSON.stringify(await ig.state.serialize()));

	let randomNumber = Math.floor(Math.random() * 10) + 1;
	if(randomNumber <= 7){
		const myProfile = await ig.account.currentUser();
		await sleep(Math.floor(Math.random() * 3) / 10);
		const userFeed = ig.feed.user(loggedInUser.pk);
		const myPostsFirstPage = await userFeed.items();
		randomNumber = Math.floor(Math.random() * 10) + 1;
		if(randomNumber <= 4){
			const followersFeed = ig.feed.accountFollowers(loggedInUser.pk);
			const items = await followersFeed.items();
		} else if(randomNumber <= 7){
			const followingFeed = ig.feed.accountFollowing(loggedInUser.pk);
			const items = await followingFeed.items();
		}
	}
	await sleep(Math.floor(Math.random() * 10) + 3); // 3 to 13

	// see home page and get lives
	const storyFeed = ig.feed.reelsTray();
	let stories = await storyFeed.request();
	let myLives = stories.broadcasts;

	await sleep(Math.random() + 0.05);
	const homeFeed = ig.feed.timeline();
	const posts = await homeFeed.items();

	for (let myLive of myLives) {
		await Report.create({
			liveUserId: myLive.broadcast_owner.pk_id, reportTime: new Date(), 
			liveBroadcastId: myLive.broadcast_owner.live_broadcast_id, igUserId: loggedInUser.pk, 
			liveUserName: myLive.broadcast_owner.username, liveFullName: myLive.broadcast_owner.full_name,
			liveIsPrivate: myLive.broadcast_owner.is_private, 
			friendshipStatusIsPrivate: myLive.broadcast_owner.friendship_status.is_private,
			profilePicUrl: myLive.broadcast_owner.profile_pic_url, coverFrameUrl: myLive.cover_frame_url, 
			dashPlaybackUrl: myLive.dash_playback_url, dashAbrPlaybackUrl: myLive.dash_abr_playback_url,
			livePostId: myLive.live_post_id, viewerCount: myLive.viewer_count, height: myLive.dimensions.height,
			width: myLive.dimensions.width
		})
	}
	process.send({ message: "Lives reported.", numberOfLives: myLives.length });

	// random postFlow actions 
	randomNumber = Math.floor(Math.random() * 10) + 1;
	if(randomNumber < 3){
		await sleep(Math.floor(Math.random() * 10) + 20); // 20 to 30
		const posts = await homeFeed.items();
	} else if(randomNumber > 8) {
		await sleep(Math.floor(Math.random() * 10) + 20); // 20 to 30
		const exploreFeed = ig.feed.discover();
		const posts = await exploreFeed.items();
	} else if(randomNumber == 5){
		await sleep(Math.floor(Math.random() * 10) + 20); // 20 to 30
		const inboxFeed = ig.feed.directInbox();
		const chats = await inboxFeed.items();
	}

	fs.writeFileSync(process.cwd() + `/instagram/sessions/${item.fileAddress}`, JSON.stringify(await ig.state.serialize()));
	process.exit(0);
});


/*
	setTimeout(async () => {
		// console.log(`Processing completed for item: ${item}`);
		if(item == 3)
			throw new Error('Whoops!');
		process.send({ status: 'done', item });
		await sleep(2);
		process.exit();
	}, 3000);
 */