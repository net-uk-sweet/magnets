var http = require('http'),
	url = require('url'),
	fs = require('fs'),
	path = require('path'),
	mime = require('mime'),
	port = process.env.OPENSHIFT_NODEJS_PORT || config.port,
	ip = process.env.OPENSHIFT_NODEJS_IP || config.ip,
	server,
	file = 'items.json',
	items = [];

// Set up a webserver
server = http.createServer(function(request, result) {
	// server code
	var path = url.parse(request.url).pathname;
	if (path == '/') path = '/index.htm';
	// console.log('Path: ' + path);
	var type = mime.lookup(path);

	fs.readFile(__dirname + path, function(error, data) {
	//	console.log(err);
		if (error) {
			result.writeHead(404);
			result.write('404');
			result.end();			
		} else {
			result.writeHead(200, {'Content-Type': type});
			result.write(data, 'utf8');
			result.end();			
		}
	});
});
server.listen(port, ip);

// Create a file to contain the game data if it doesn't exist
if (!path.existsSync(file)) {
	fs.open(file, 'w+', '0666', function(err, fd) {
		if (err) throw(err);
	});
}

// Configure socket.io
var io = require('socket.io').listen(server); 

io.configure('production', function() {
	io.enable('browser client etag');
	io.set('log level', 1);
	io.set('transports', [
		'websocket',
		'flashsocket',
		'htmlfile',
		'xhr-polling',
		'jsonp-polling'
	]);
});


io.sockets.on('connection', function (socket) {
	
	//console.log("Connected");
	
	// Read the game data file
	fs.readFile(file, 'utf8', function(err, data) {
		
		if (err) throw(err);		
		
		var clients = io.sockets.clients();
		var client;
		var selected = [];
		
		var callback = function(err, id) {
			if (id !== null) selected.push(id);
		};

		// Get the selected item ids from our client list
		// TODO: Could this not be stored on the item data? 
		for (var i = 0; i < clients.length; i ++) {
			client = clients[i];
			client.get('selected', callback);
		}
		
		//console.log('Socket: ' + socket);			
		if (data.length) 
			items = JSON.parse(data);
		
		send(socket, 'push', {
			items: items, 
			selected: selected, 
			count: clients.length
		});
		
		broadcast(socket, 'count', clients.length);
	});

	// Shouldn't need to route everything through message.
	// Could bin off the type property in the data and use the
	// event type itself - then have separate callbacks for each
	socket.on('message', function (msg) { 

		msg = JSON.parse(msg);

		var type = msg.type;
		var body = msg.body;

		//console.log("Received message: " + msg.type);	
		
		// Handle incoming messages appropriately.
		var handler = {
			'add': function() {
				body.id = getGUID();
				items.push(body);
				setData(items);
				send(socket, 'guid', body.id);
				broadcast(socket, 'add', body);
			},
			'update': function() {
				var l = items.length;
				var i = 0;
				var item;
				while (i < l) {
					item = items[i];
					if (item.id === body.id) {
						items.splice(i, 1);
						items.push(body);
						setData(items);
						broadcast(socket, 'update', body);
						return;
					}
					i ++;
				}
			},
			'remove': function() {
				var l = items.length;
				var i = 0;
				var item; 
				while (i < l) {
					item = items[i];
					if (item.id === body) {
						items.splice(i, 1);
						setData(items);
						broadcast(socket, 'remove', body); 
						return;
					}
					i ++;
				}
			},
			'selected': function() {
				var unselected;
				socket.get('selected', function(err, id) {
					unselected = id; // may be null
					socket.set('selected', body, function(err){
						broadcast(socket, 'selected', {
							unselected: unselected,
							selected: body
						});
					});
				});
			},
			'clear': function() {
				items = [];
				setData(items);
				broadcast(socket, 'clear', true);
			},
			'history': function() {
				// console.log('History');
			},
			'reset': function() {
				// Do a push here
				// console.log('Resetting');
			}			
		};

		handler[type]();
	});

	socket.on('disconnect', function() {
		// console.log("Disconnected");
		socket.get('selected', function(err, id) {
			console.log("id: " + id);
			if (id !== null) {
				broadcast(socket, 'selected', {
					unselected: id,
					selected: null
				});
			}
		});
		broadcast(socket, "count", io.sockets.clients().length - 1);
	});
});

// Sends to the invokee
function send(socket, type, body) {
	//console.log('Sending to ' + socket);
	socket.emit('message', {type: type, body: body});
}

// Sends to everyone, or to everyone excluding the invokee if !all
function broadcast(socket, type, body, all) {
	socket.broadcast.emit('message', {type: type, body: body});
	if (all) send(socket, type, body);
}

// Write game data to file
function setData(data) {	
	fs.writeFile(file, JSON.stringify(data)); 	
}

// Give me a (semi) guid
function getGUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}

