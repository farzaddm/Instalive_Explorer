const { fork } = require('child_process');

async function sleep(s){
	await new Promise((resolve, reject) => {setTimeout(() => resolve(), s*1000)});
}

async function ne() {
	const child = fork('./test.js');
	await sleep(0.25);
	let tt = 1;
	child.send({ userName: 'sss', password: 'aaa', t: 1 });

	child.on('message', async (mes) => {
		if(mes.requestCode){
			console.log('From parent:  ', mes);
			await sleep(2);
			tt++;
			child.send({ itsme: 1, t: tt});
		};
	});
	child.on('error', async (err) => {
		console.error("Session_bulder: Unhandled error:", err);
	})
	child.on('exit', async (code, signal) => {
		if (code == 0){
			console.log('New session created successfully.');
		} else
			console.log('New session encounter some error.');
	});
}

// async function hey(){
// 	console.log("hey");
// }

// setInterval(hey, 60*1000);
ne();
