
CREATE TABLE our_user(
	t_user_id INT NOT NULL PRIMARY KEY,
	t_name TEXT,
	ig_user_name VARCHAR(255),
	ig_password VARCHAR(255),
	ig_user_id VARCHAR(100),
	ig_status SMALLINT, -- state of user ig account
	authority_code TEXT,
	payment_status SMALLINT DEFAULT 0,
	paid_time timestamp,
	user_status SMALLINT -- user state in our site
);

CREATE TABLE relationship(
	t_user_id INT NOT NULL,
	page_id VARCHAR(100) NOT NULL,
	relation_state SMALLINT NOT NULL,	-- 1: favorite, 2: hate
	ig_user_name VARCHAR(255),
	ig_full_name VARCHAR(255),
	PRIMARY KEY(t_user_id, page_id), 
	FOREIGN KEY (t_user_id) REFERENCES our_user(t_user_id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE ig_sessions(
	ig_user_id VARCHAR(100) NOT NULL PRIMARY KEY,
	ig_user_name VARCHAR(255)  NOT NULL,
	ig_password VARCHAR(255) NOT NULL,
	session_state SMALLINT NOT NULL NOT NULL,
	file_address VARCHAR(255),
	last_report timestamp,
	error_counter SMALLINT DEFAULT 0,
);

CREATE TABLE report(
	live_user_id VARCHAR(100) NOT NULL,
	report_time timestamp NOT NULL,
	live_broadcast_id VARCHAR(255) NOT NULL,
	ig_user_id VARCHAR(100) NOT NULL,
	live_user_name VARCHAR(255),
	live_full_name VARCHAR(255),
	live_is_private BOOL,
	friendship_status_is_private BOOL,
	profile_pic_url TEXT,
	cover_frame_url TEXT,
	dash_playback_url TEXT,
	dash_abr_playback_url TEXT,
	live_post_id  VARCHAR(255),
	viewer_count SMALLINT,
	height INT,
	width INT,
	PRIMARY KEY(live_user_id, report_time),
	FOREIGN KEY (ig_user_id) REFERENCES ig_sessions(ig_user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE live(
	live_user_id VARCHAR(100) NOT NULL,
	report_time timestamp NOT NULL,
	live_broadcast_id VARCHAR(255) NOT NULL,
	ig_user_id VARCHAR(100) NOT NULL,
	live_user_name VARCHAR(255),
	live_full_name VARCHAR(255),
	live_is_private BOOL,
	friendship_status_is_private BOOL,
	profile_pic_address TEXT,
	cover_frame_address TEXT,
	dash_playback_address TEXT,
	dash_abr_playback_address TEXT,
	viewer_count SMALLINT,
	like_count INT DEFAULT 0, 
	PRIMARY KEY(live_user_id, report_time),
	FOREIGN KEY (ig_user_id) REFERENCES ig_sessions(ig_user_id) ON DELETE CASCADE ON UPDATE CASCADE
);
