const { DataTypes, Sequelize } = require('sequelize');
// const sequelize = require('./db');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
	dialect: 'postgres',
	logging: false,
});

const OurUser = sequelize.define('OurUser', {
	tUserId: {
		type: DataTypes.STRING(100),
		primaryKey: true,
		allowNull: false,
		field: 't_user_id'
	},
	tName: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 't_name'
	},
	igUserName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'ig_user_name'
	},
	igPassword: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'ig_password'
	},
	igUserId: {
		type: DataTypes.STRING(100),
		allowNull: true,
		field: 'ig_user_id'
	},
	igStatus: {
		type: DataTypes.SMALLINT,
		allowNull: true,
		field: 'ig_status'
	},
	authorityCode: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'authority_code'
	},
	paymentStatus: {
		type: DataTypes.SMALLINT,
		allowNull: false,
		defaultValue: 0,
		field: 'payment_status'
	},
	paidTime: {
		type: DataTypes.DATE,
		allowNull: true,
		field: 'paid_time'
	},
	userStatus: {
		type: DataTypes.SMALLINT,
		allowNull: true,
		field: 'user_status'
	}
}, {
	tableName: 'our_user',
	timestamps: false
});

const Relationship = sequelize.define('Relationship', {
	tUserId: {
		type: DataTypes.STRING(100),
		primaryKey: true,
		allowNull: false,
		references: {
			model: 'our_user',
			key: 't_user_id'
		},
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		field: 't_user_id'
	},
	pageId: {
		type: DataTypes.STRING(100),
		allowNull: false,
		primaryKey: true,
		field: 'page_id'
	},
	igUserName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'ig_user_name'
	},
	igFullName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'ig_full_name'
	},
	relationState: {
		type: DataTypes.SMALLINT,
		allowNull: false,
		field: 'relation_state'
	}
}, {
	tableName: 'relationship',
	timestamps: false
});

const IgSession = sequelize.define('IgSession', {
	igUserId: {
		type: DataTypes.STRING(100),
		primaryKey: true,
		allowNull: false,
		field: 'ig_user_id'
	},
	igUserName: {
		type: DataTypes.STRING(255),
		allowNull: false,
		field: 'ig_user_name'
	},
	igPassword: {
		type: DataTypes.STRING(255),
		allowNull: false,
		field: 'ig_password'
	},
	sessionState: {
		type: DataTypes.SMALLINT,
		allowNull: false,
		field: 'session_state'
	},
	fileAddress: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'file_address'
	},
	lastReport: {
		type: DataTypes.DATE,
		allowNull: true,
		field: 'last_report'
	},
	errorCounter: {
		type: DataTypes.SMALLINT,
		allowNull: true,
		defaultValue: 0,
		field: 'error_counter'
	}
}, {
	tableName: 'ig_sessions',
	timestamps: false
});


const Report = sequelize.define('Report', {
	liveUserId: {
		type: DataTypes.STRING(100),
		primaryKey: true,
		allowNull: false,
		field: 'live_user_id'
	},
	reportTime: {
		type: DataTypes.DATE,
		primaryKey: true,
		allowNull: false,
		field: 'report_time'
	},
	liveBroadcastId: {
		type: DataTypes.STRING(255),
		allowNull: false,
		field: 'live_broadcast_id'
	},
	igUserId: {
		type: DataTypes.STRING(100),
		allowNull: false,
		references: {
			model: 'ig_sessions',
			key: 'ig_user_id'
		},
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		field: 'ig_user_id'
	},
	liveUserName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'live_user_name'
	},
	liveFullName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'live_full_name'
	},
	liveIsPrivate: {
		type: DataTypes.BOOLEAN,
		allowNull: true,
		field: 'live_is_private'
	},
	friendshipStatusIsPrivate: {
		type: DataTypes.BOOLEAN,
		allowNull: true,
		field: 'friendship_status_is_private'
	},
	profilePicUrl: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'profile_pic_url'
	},
	coverFrameUrl: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'cover_frame_url'
	},
	dashPlaybackUrl: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'dash_playback_url'
	},
	dashAbrPlaybackUrl: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'dash_abr_playback_url'
	},
	livePostId: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'live_post_id'
	},
	viewerCount: {
		type: DataTypes.SMALLINT,
		allowNull: true,
		field: 'viewer_count'
	},
	height: {
		type: DataTypes.INTEGER,
		allowNull: true
	},
	width: {
		type: DataTypes.INTEGER,
		allowNull: true
	}
}, {
	tableName: 'report',
	timestamps: false
});


const Live = sequelize.define('Live', {
	liveUserId: {
		type: DataTypes.STRING(100),
		primaryKey: true,
		allowNull: false,
		field: 'live_user_id'
	},
	reportTime: {
		type: DataTypes.DATE,
		primaryKey: true,
		allowNull: false,
		field: 'report_time'
	},
	liveBroadcastId: {
		type: DataTypes.STRING(255),
		allowNull: false,
		field: 'live_broadcast_id'
	},
	igUserId: {
		type: DataTypes.STRING(100),
		allowNull: false,
		references: {
			model: 'ig_sessions',
			key: 'ig_user_id'
		},
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		field: 'ig_user_id'
	},
	liveUserName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'live_user_name'
	},
	liveFullName: {
		type: DataTypes.STRING(255),
		allowNull: true,
		field: 'live_full_name'
	},
	liveIsPrivate: {
		type: DataTypes.BOOLEAN,
		allowNull: true,
		field: 'live_is_private'
	},
	friendshipStatusIsPrivate: {
		type: DataTypes.BOOLEAN,
		allowNull: true,
		field: 'friendship_status_is_private'
	},
	profilePicAddress: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'profile_pic_address'
	},
	coverFrameAddress: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'cover_frame_address'
	},
	dashPlaybackAddress: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'dash_playback_address'
	},
	dashAbrPlaybackAddress: {
		type: DataTypes.TEXT,
		allowNull: true,
		field: 'dash_abr_playback_address'
	},
	viewerCount: {
		type: DataTypes.SMALLINT,
		allowNull: true,
		field: 'viewer_count'
	},
	likeCount: {
		type: DataTypes.INTEGER,
		allowNull: true,
		defaultValue: 0,
		field: 'like_count'
	}
}, {
	tableName: 'live',
	timestamps: false
});

module.exports = {
	Live,
	Report,
	Relationship,
	OurUser,
	IgSession,
};
