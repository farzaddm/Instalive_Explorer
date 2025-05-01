
function success(message = 'Operation successful', data = 'No additional data available') {
	return {
		status: 'success',
		message,
		data,
	};
}

function error(message, code = 400) {
	return {
		status: 'error',
		message,
		code,
	};
}

module.exports = { success, error };
