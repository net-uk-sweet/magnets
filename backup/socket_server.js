var http = require('http')
, url = require('url')
, fs = require('fs')
, server;



server = http.createServer(function(req, res){
	// server code
	var path = url.parse(req.url).pathname;
	console.log(path);
	switch (path){
		case '/':
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<h1>Hello!</h1> Try the <a href="/socket-io-test.html">socket test page</a>');
		res.end();
		break;
				
		//case 'magnets.htm':
		default: 
		fs.readFile(__dirname + path, function(err, data) {
		//	console.log(err);
			if (err) return send404(res);
			res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'});
			res.write(data, 'utf8');
			res.end();
		});
		//break;

		//default: send404(res);
	}
}),

send404 = function(res){
	res.writeHead(404);
	res.write('404');
	res.end();
};

server.listen(8080);

var io = require('socket.io').listen(server); 
io.sockets.on('connection', function (socket) {
  //console.log("Client connected");
  socket.on('message', function (msg) { 
	console.log("Received message:" + msg);
  });
  socket.on('disconnect', function () { });
});
