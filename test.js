var _ = require('lodash');
var TextEncoder = require('text-encoding').TextEncoder;
var TextDecoder = require('text-encoding').TextDecoder;

var mudServer = require('./mudServer');

mudServer.init(function (server) {
	server.on("*", function (a, b, c) {
		console.log(a,b,c)
	})

	// testing
	var jasonClient = new server.Client();

	jasonClient.on('write', function (data) {
		console.log('Jason client - ', data);


		if(data == 'Welcome, what is your name? '){
			setTimeout(function () {
				var array = TextEncoder("utf-8").encode('Jason\r');
				array.toString = function () {
					return TextDecoder("utf-8").decode(this)
				}
				//array.toString = derp;
				jasonClient.emit('data', array);
			}, 1000)
		}
	});


	server.emit('connect', jasonClient);

	//server.emit('connect', {user: 'Jason'});
});