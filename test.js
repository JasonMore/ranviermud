var mudServer = require('./mudServer');

mudServer.init(function (server) {
	server.on("*", function (a, b, c) {
		console.log(a,b,c)
	})

	// testing
	var jasonClient = new server.Client();

	jasonClient.on('data', function (data) {
		console.log('Jason client - ', data);
	});

	server.emit('connect', jasonClient);

	//server.emit('connect', {user: 'Jason'});
});