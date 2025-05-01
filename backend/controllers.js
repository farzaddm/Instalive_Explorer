const { success, error } = require('./utils');
const { sequelize, Report, Relationship, OurUser, IgSession, Live } = require('./configs');
const { Op } = require('sequelize');

async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}

async function startScraler(req, res) {
	const response = await fetch('http://localhost:3085/api/v1/start');
	if(response.status != 200){
		res.status(500).json(error("Internal Server Error", 500));
		return 1;
	}
	return 0;
}

async function profile(req, res) {
	const user = await OurUser.findOne({ where: { tUserId: req.tUserId.toString()} });
	if(!user) 
		return res.status(403).json(error('User not found.', 403));

	res.status(200).json(success('User:', user));
}

async function isOurUSer(req, res) {
	const user = await OurUser.findOne({ where: { tUserId: req.tUserId.toString()} });
	if(!user){
		res.status(403).json(error('User not found.', 403));
		return 1;
	}
	return user;
}

async function getLiveList(req, res, state, hatedPages) {
	let lives = undefined;
	if(state == 1){
		lives = await Live.findAll({
			where: {
				igUserId: {
					[Op.notIn]: hatedPages.length > 0 ? hatedPages : ["0"] // [0] as a dummy value if no hated pages
				},
				liveIsPrivate: false,
			}
		});
	} else if(state == 2){
		lives = await Live.findAll({
			where: {
				igUserId: {
					[Op.notIn]: hatedPages.length > 0 ? hatedPages : ["0"] // [0] as a dummy value if no hated pages
				},
				liveIsPrivate: true,
			}
		});
	} else{
		lives = await Live.findAll({
			where: {
				igUserId: {
					[Op.notIn]: hatedPages.length > 0 ? hatedPages : ["0"] // [0] as a dummy value if no hated pages
				}
			}
		});
	}
	return lives;
}

async function liveFinder(req, res, state){
	const relationships = await Relationship.findAll({
		where: { tUserId: req.tUserId.toString() }
	});

	const hatedPages = relationships
		.filter(rel => rel.relationState === 2)
		.map(rel => rel.pageId);

	const favoritePages = relationships
		.filter(rel => rel.relationState === 1)
		.map(rel => rel.pageId);

	let lives = await getLiveList(req, res, state, hatedPages);
	if (lives.length === 0){
		await sleep(4);
		lives = await getLiveList(req, res, state, hatedPages);
	}

	const sortedLives = lives.sort((a, b) => {
		const aFav = favoritePages.includes(a.igUserId) ? 0 : 1;
		const bFav = favoritePages.includes(b.igUserId) ? 0 : 1;
		if (aFav !== bFav) {
			return aFav - bFav;
		} else {
			// Compare likeCount (descending)
			if (b.likeCount !== a.likeCount) { // b.viewerCount !== a.viewerCount
				return b.likeCount - a.likeCount;
			} else {
				// Compare viewerCount (descending)
				return b.viewerCount - a.viewerCount;
			}
		}
	});

	return res.status(200).json(success('Lives:', sortedLives));
}

async function allLive(req, res) {
	let temp = await isOurUSer(req, res);
	if (temp == 1)
		return;
	temp = await startScraler(req, res);
	if (temp == 1)
		return;
	await liveFinder(req, res, 0);
}

async function publicLive(req, res) {
	let temp = await isOurUSer(req, res);
	if (temp == 1)
		return;
	temp = await startScraler(req, res);
	if (temp == 1)
		return;
	await liveFinder(req, res, 1);
}

async function privateLive(req, res) {
	let temp = await isOurUSer(req, res);
	if (temp == 1)
		return;
	temp = await startScraler(req, res);
	if (temp == 1)
		return;
	await liveFinder(req, res, 2);
}

async function pageRelation(req, res) {
	await isOurUSer(req, res);

	const { pageId, relationState, igUserName, igFullName } = req.body;
	if (!pageId || !relationState || !igUserName || !igFullName)
		return res.status(404).json(error('Missing parameter.', 404));

	let rel = await Relationship.findOne({ where: { tUserId: req.tUserId.toString(), pageId } });
	if (rel){
		if (relationState == 3){
			Relationship.destroy({ where: { tUserId: req.tUserId.toString(), pageId} });
		} else {
			await rel.update({ relationState, igUserName, igFullName });
		}
	}
	else
		rel = await Relationship.create({ tUserId: req.tUserId.toString(), pageId, relationState, igUserName, igFullName });

	res.status(201).json(success('Relation update successfully.', rel));
}

async function likeLive(req, res) {
	await isOurUSer(req, res);

	const { liveBroadcastId, state } = req.body;
	if(!liveBroadcastId || !state)
		return res.status(404).json(error('Missing parameter.', 404));

	// const [results, metadata] = await sequelize.query(`UPDATE live SET like_count = 2 WHERE live_broadcast_id = '${liveBroadcastId}';`);
	let live = await Live.findOne({ where: { liveBroadcastId } }); // live_user_id: 123456789
	if(!live)
		return res.status(404).json(error('Live ended.', 404));

	if(state == 1){
		// await live.update({ likeCount: parseInt(live.likeCount + 1) }, { logging: console.log });
		await Live.update(
			{ likeCount: sequelize.literal('like_count + 1') },
			{ where: { liveBroadcastId }} // , logging: console.log 
		);
		live.likeCount++;
	}
	else {
		if(live.likeCount > 0){
			// await live.update({ likeCount: live.likeCount - 1 });
			await Live.update(
				{ likeCount: sequelize.literal('like_count - 1') },
				{ where: { liveBroadcastId }} // , logging: console.log 
			);
			live.likeCount--;
		}
	}

	res.status(201).json(success('Like updated.', live)); //live, results
}

async function hateList(req, res){
	await isOurUSer(req, res);

	const hate = await Relationship.findAll({ where: {
		tUserId: req.tUserId.toString(), relationState: 2
	}});

	res.status(200).json(success('Hate list:', hate));
}

async function loveList(req, res){
	await isOurUSer(req, res);

	const love = await Relationship.findAll({ where: {
		tUserId: req.tUserId.toString(), relationState: 1
	}});

	res.status(200).json(success('Love list:', love));
}

module.exports = {
	profile,
	allLive,
	publicLive,
	privateLive,
	pageRelation,
	likeLive,
	hateList,
	loveList,
}
