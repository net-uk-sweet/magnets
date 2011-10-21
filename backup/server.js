var http = require('http')
, url = require('url')
, fs = require('fs')
, path = require('path')
, mime = require('mime')
, server
, file = "magnets.json"
, gameData = []
, clients = {};

server = http.createServer(function(req, res){
	// server code
	var path = url.parse(req.url).pathname;
	var type = mime.lookup(path);

	if (path === "/" || path === "")
		path = "index.htm";

	fs.readFile(__dirname + path, function(err, data) {
	//	console.log(err);
		if (err) return send404(res);
		res.writeHead(200, {'Content-Type': type});
		res.write(data, 'utf8');
		res.end();
	});
}),

send404 = function(res){
	res.writeHead(404);
	res.write('404');
	res.end();
};

//server.listen(process.env.PORT || 4000);
server.listen(8080);

// Create a file to contain the game data if it doesn't exist
if (!path.existsSync(file)) {
	fs.open(file, "w+", "0666", function(err, fd) {
		if (err) throw(err);
	});
}

var io = require('socket.io').listen(server); 
io.sockets.on('connection', function (socket) {

	fs.readFile(file, "utf8", function(err, data) {
		if (err) throw(err);
		//console.log("Socket: " + socket);			
		if (data.length) gameData = JSON.parse(data);
		send(socket, "push", gameData);
	});

	socket.on('message', function (msg) { 

		msg = JSON.parse(msg);

		var type = msg.type
		var body = msg.body;

		//console.log("Received message: " + msg.type);	
		
		// Handle incoming messages appropriately.
		var handler = {
			"add": function() {
				body.id = getGUID();
				gameData.push(body);
				setData(gameData);
				send(socket, "guid", body.id);
				broadcast(socket, "add", body);
			},
			"update": function() {
				var l = gameData.length;
				var i = 0;
				var item;
				while (i < l) {
					item = gameData[i];
					if (item.id === body.id) {
						gameData.splice(i, 1);
						gameData.push(body);
						setData(gameData);
						broadcast(socket, "update", body);
						return;
					}
					i ++;
				}
			},
			"remove": function() {
				var l = gameData.length;
				var i = 0;
				var item; 
				while (i < l) {
					item = gameData[i];
					if (item.id === body) {
						gameData.splice(i, 1);
						setData(gameData);
						send(socket, "remove", body);
						broadcast(socket, "remove", body); 
						return;
					}
					i ++;
				}
			},
			"clear": function() {
				gameData = [];
				setData(gameData);
				send(socket, "clear");
				broadcast(socket, "clear");
			},
			"history": function() {
				console.log("History");
			},
			"reset": function() {
				// Do a push here
				console.log("Resetting");
			}			
		}

		handler[type]();
	});

	socket.on('disconnect', function() {
		// Handle disconnect	
	});
});

// Sends to the invokee
function send(socket, type, body) {
	//console.log("Sending to " + socket);
	socket.emit("message", {type: type, body: body});
}

// Sends to all but the invokee
function broadcast(socket, type, body) {
	socket.broadcast.emit("message", {type: type, body: body});
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

