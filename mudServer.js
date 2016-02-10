var
// built-ins
	util = require('util'),
	events = require('events'),

// local
	Commands = require('./src/commands').Commands,
	Rooms = require('./src/rooms').Rooms,
	Npcs = require('./src/npcs').Npcs,
	Items = require('./src/items').Items,
	Data = require('./src/data').Data,
	Events = require('./src/events').Events,
	Plugins = require('./src/plugins'),
	PlayerManager = require('./src/player_manager').PlayerManager

	;

// config hack
var commander = {
	locale: 'EN',
	save: 10,
	respawn: 20,
	verbose: true
}


//storage of main game entities
var players,
	rooms = new Rooms(),
	items = new Items(),
	npcs = new Npcs(),
	server,

// Stuff for the server executable
	l10n,
	respawnint,
	saveint;


function Client() {
	var self = this;
	events.EventEmitter.call(this);
}

util.inherits(Client, events.EventEmitter);

Client.prototype.write = function (stuff) {
	//console.log('CLIENT', stuff);
	this.emit('data', stuff);
};

function mudServer(clientConnected) {
	var self = this;
	events.EventEmitter.call(this);

	self.on('connect', connect);

	function connect(client) {
		clientConnected(client);
	}
}

util.inherits(mudServer, events.EventEmitter);

mudServer.prototype.Client = Client;

module.exports.init = function (cb) {
	util.log("START - Loading entities");
	players = new PlayerManager([]);
	//restart_server = typeof restart_server === 'undefined' ? true : restart_server;
	restart_server = true;

	Commands.configure({
		rooms: rooms,
		players: players,
		items: items,
		npcs: npcs,
		locale: commander.locale
	});

	Events.configure({
		players: players,
		items: items,
		locale: commander.locale,
		npcs: npcs,
		rooms: rooms
	});

	if (restart_server) {
		util.log("START - Starting server");

		/**
		 * Effectively the 'main' game loop but not really because it's a REPL
		 */
		server = new mudServer(function (socket) {
			socket.on('interrupt', function () {
				socket.write("\n*interrupt*\n");
			});

			// Register all of the events
			for (var event in Events.events) {
				socket.on(event, Events.events[event]);
			}

			socket.write("Connecting...\n");
			util.log("User connected...");
			// @see: src/events.js - Events.events.login
			socket.emit('login', socket);
		});

		// start the server
		//server.listen(commander.port).on('error', function(err) {
		//	if (err.code === 'EADDRINUSE') {
		//		util.log("Cannot start server on port " + commander.port + ", address is already in use.");
		//		util.log("Do you have a MUD server already running?");
		//	} else if (err.code === 'EACCES') {
		//		util.log("Cannot start server on port " + commander.port + ": permission denied.");
		//		util.log("Are you trying to start it on a priviledged port without being root?");
		//	} else {
		//		util.log("Failed to start MUD server:");
		//		util.log(err);
		//	}
		//	process.exit(1);
		//});

		// save every 10 minutes
		util.log("Setting autosave to " + commander.save + " minutes.");
		clearInterval(saveint);
		saveint = setInterval(save, commander.save * 60000);

		// respawn every 20 minutes, probably a better way to do this
		util.log("Setting respawn to " + commander.respawn + " minutes.");
		clearInterval(respawnint);
		respawnint = setInterval(load, commander.respawn * 60000);

		Plugins.init(true, {
			players: players,
			items: items,
			locale: commander.locale,
			npcs: npcs,
			rooms: rooms,
			server: server
		});

	}

	load(function (success) {
		if (success) {
			//util.log(util.format("Server started on port: %d %s", commander.port, '...' ));
			//server.emit('startup');
			cb(server);
		} else {
			process.exit(1);
		}
	});
};

/**
 * Save all connected players
 */
function save() {
	util.log("Saving...");
	players.each(function (p) {
		p.save();
	});
	util.log("Done");
}

/**
 * Load rooms, items, npcs. Register items and npcs to their base locations.
 * Configure the event and command modules after load. Doubles as a "respawn"
 */
function load(callback) {
	util.log("Loading rooms...");
	rooms.load(commander.verbose, function () {
		util.log("Done.");
		util.log("Loading items...");
		items.load(commander.verbose, function () {
			util.log("Done.");

			util.log("Adding items to rooms...");
			items.each(function (item) {
				if (item.getRoom()) {
					var room = rooms.getAt(item.getRoom());
					if (!room.hasItem(item.getUuid())) {
						room.addItem(item.getUuid());
					}
				}
			});
			util.log("Done.");

			util.log("Loading npcs...");
			npcs.load(commander.verbose, function () {
				util.log("Done.");

				util.log("Adding npcs to rooms...");
				npcs.each(function (npc) {
					if (npc.getRoom()) {
						var room = rooms.getAt(npc.getRoom());
						if (!room.hasNpc(npc.getUuid())) {
							room.addNpc(npc.getUuid());
						}
					}
				});
				util.log("Done.");
				if (callback) {
					callback(true);
				}
			});
		});
	});
}

