var palette = {
	
	config: {
		colors: {
			"red": "#ff0000",
			"green": "#00ff00",
			"yellow": "#ffff00",
			"blue": "#0000ff"
		}			
	},
	
	init: function(config) {
		$.extend(palette.config, config);
		var colors = palette.config.colors;
		for (var color in colors) {
			$("#" + color).click(function(event) {
				drop.setColor(colors[this.id]);
			})
			.button({
				icons: {
					primary: "ui-icon-image"
				},
				text: false
			});
		}
	},
	
	setEnabled: function(value) {
		var colors = palette.config.colors;
		for (var color in colors) {
			//$("#" + color).fadeOut();
		}
	}
};

var menu = {

	index: 0,
	config: {
		chars: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", 
			"l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w",
			"x", "y", "z"
		],		
		
		next: "#next",
		prev: "#prev"	
	},
	
	init: function(config) {
		$.extend(menu.config, config);
		var config = menu.config;
		
		$(config.prev).button({
			icons: {
				primary: "ui-icon-triangle-1-w"
			},
			text: false
		});
		button.binder($(config.prev), menu.prev);
		
		$(config.next).button({
			icons: {
				primary: "ui-icon-triangle-1-e"
			},
			text: false
		});
		button.binder($(config.next), menu.next);
			
		menu.update();
	},
	
	next: function() {
		menu.index ++;
		menu.update();
	},
	
	prev: function() {
		menu.index --;
		menu.update();
	},
	
	update: function() {
		
		var chars = menu.config.chars;
		
		if (menu.index > chars.length - 1)
			menu.index = 0;
			
		if (menu.index < 0)
			menu.index = chars.length - 1;
		
		$('#chars').html("<span id='" 
			+ drop.added 
			+ "' class='drag'>" 
			+ chars[menu.index] 
			+ "<\/span>");
		
		$('#chars span').css("color", "#CCC").draggable({
			tolerance: "touch"
		});
	}
};

var drop = {
	
	selected: "",
	items: [],
	added: "added", // tmp id for new magnets
	config: {
		rotation: 15,
		lag: 8, // pixel resistance on the drag
		target: "#drop",
		out: "#wrapper"
	},
	
	init: function(data, config) {
		$.extend(socket.config, config);
		drop.items = data;
		
		if (data) {
			var html = "";
			$.each(data, function() {			
				drop.addItem(this);
			});
		} else {
			drop.items = [];
		}	
		
		drop.initTarget();
		drop.initOut();
	},
	
	initTarget: function() {
		
		var $target = $(drop.config.target);
		var $this;
		var $drag;
		var $id;
		var item;
		var x;
		var y;
		
		$target.droppable({
			accept: ".drag",
			tolerance: "fit",
			drop: function(event, ui) {
				
				//console.log("in");
				$this = $(this);	
				$drag = ui.draggable;
				$id = $drag.attr("id");
				
				if ($id === drop.added) {
					
					var offset = $this.offset();

					// It's a new magnet
					x = event.pageX - offset.left - ($drag.width() / 2); 
					y = event.pageY - offset.top - ($drag.height() / 2); 
					
					$this.append($drag);
					
					item = {
						id: $id,
						v: $drag.contents().clone()[0].data,
						c: drop.getColor(),
						x: x,
						y: y,
						r: drop.getRotation()
					};
					
					$drag.attr("id", item.id);						
					menu.update();

					drop.setProps($drag, item);
					drop.items.push(item);
					
					socket.send("add", item);
				} else {
					// It's been moved within the target
					item = drop.getItem($id);
					item.x = $drag.css("left");
					item.y = $drag.css("top");
					drop.setSelected($id);
					socket.send("update", item);
				}
			}
		});
	},
	
	initOut: function() {
		
		$(drop.config.out).droppable({
			accept: "#" + drop.added,
			drop: function(event, ui) {
				//console.log("out");
				ui.draggable.remove();
				menu.update();
			}
		});
	},
	
	addItem: function(item) {
		var $target = $(drop.config.target);
		var $drag;
				
		if (!drop.getItem(item.id)) {
			drop.items.push(item);
		}
			
		$target.append("<span class='drag' id='" 
			+ item.id + "'>" 
			+ item.v 
			+ "<\/span>");
			
		drop.setProps($("#" + item.id), item);
	},

	update: function(data) {
		$("#" + data.id) 
			.css("color", data.c)
			.css("left", data.x)
			.css("top", data.y)
			.css("-webkit-transform", "rotate(" + data.r + "deg)")
			.css("-moz-transform", "rotate(" + data.r + "deg)");
			
		var item = drop.getItem(data.id);
		item.c = data.c;
		item.x = data.x;
		item.y = data.y;
		item.r = data.r;
	},
	
	clear: function() {
		$(drop.config.target).children().remove();
		drop.items = [];
	},
	
	setID: function(id) {
		var item = drop.getItem("added");
		item.id = id;
		$("#added").attr("id", id);
		drop.setSelected(id);
	},
	
	setColor: function(color) {
		$("#" + drop.selected).css("color", color);
		var item = drop.getItem(drop.selected);
		item.c = color;
		socket.send("update", item);
	},
	
	setSelected: function(id) {
		$("#" + drop.selected).removeClass("highlight");
		drop.selected = id;
		$("#" + id).addClass("highlight");
	},
	
	rotate: function(rotation) {
		var $drag = $("#" + drop.selected);
		var item = drop.getItem(drop.selected);
			
		item.r = item.r + rotation;
		$drag.css("-webkit-transform", "rotate(" + item.r + "deg)");
		$drag.css("-moz-transform", "rotate(" + item.r + "deg)");
		socket.send("update", item);
	},
	
	remove: function(id) {
		var items = drop.items;
		var l = items.length;
		var i = 0;
		var item;

		$("#" + id).remove();
		while (i < l) {
			item = items[i];
			if (item.id === id) {
				items.splice(i, 1);
				return;
			}
				
			i ++;
		}	
	},
	
	setProps: function($drag, item) {

		$drag.css("position", "absolute")
			.css("color", item.c)
			.css("left", item.x)
			.css("top", item.y)
			.css("-webkit-transform", "rotate(" + item.r + "deg)")
			.css("-moz-transform", "rotate(" + item.r + "deg)")
			.click(function() {
				drop.setSelected($(this).attr("id"));
			})
			.draggable({
				containment: drop.config.target,
				distance: drop.config.lag,
				scroll: false
			});		
	},
	
	getItem: function(id) {
		var items = drop.items;
		var l = items.length;
		var i = 0;
		var item;

		while (i < l) {
			item = items[i];
			if (item.id === id) {
				return item;	
			}		
			i ++;
		}
		return false;
	},
	
	getColor: function() {
		
		var colors = palette.config.colors;
		var c = 0;
		var ret;

	    for (var color in colors) {
	        if (Math.random() < 1/++c) {
	           ret = colors[color];
	        }
	    }
	    
	    return ret;
	},
	
	getRotation: function() {
		return 330 + (Math.floor(Math.random() * 5) * drop.config.rotation);
	}
}

var socket = {
	
	connection: "",	
	disabled: false,
	config: {
		logger: "#log",
		host: "http://localhost"
	},
	
	connect: function(config) {	
		
		// Allows us to override built in config object
		$.extend(socket.config, config);
				
		try {
			socket.connection = io.connect();
			// Set initial not ready message
			socket.log("event", "Socket status: closed");

			socket.connection.on('connect', function() {
				socket.log("event", "Socket status: open");
				drop.clear();
			});
			
			socket.connection.on('message', function(msg) {
				
				var type = msg.type;
				var body = msg.body;
				 
				socket.log("message", "Received message: " + type 
					+ " : body : " + JSON.stringify(body));
				
				var handler = {
					"push" : function() {
						drop.init(body);
					},
					"add" : function() {
						drop.addItem(body);
					},
					"update" : function() {
						drop.update(body);
					}, 
					"remove" : function() {
						drop.remove(body);
					},
					"guid" : function() {
						drop.setID(body);
					},
					"history" : function() {
						socket.disabled = true;
						history.start(body);
					},
					"clear" : function() {
						drop.clear();	
					},	
					"count" : function() {
						$("#count").html("Connected users: " + body);
					}					
				};
				
				handler[msg.type]();
			});								
		} 
		catch(exception) {
			socket.log("warning", "Error" + exception);
		}
	},
	
	send: function(type, body) {
		try {
			var json = JSON.stringify({type: type, body: body});
			socket.connection.send(json);
			socket.log('event', 'Sent message: ' + type + ' : body : ' 
				+ JSON.stringify(body));
		} catch(exception) {
			socket.log('warning', 'Could not send message');
		}		
	},	

	close: function() {
		socket.connection.disconnect();	
	},
	
	log: function(type, msg) {
		var $logger = $(socket.config.logger);
		msg = "<p class='" + type + "'>" + msg + "<\/p>";

		($logger.html() == "") 
			? $logger.html(msg) 
			: $logger.prepend(msg);
	}
};

var button = {
	binder : function($button, handler, params) {
		$button.bind("mousedown", function(event) {
			this.interval = setInterval(function(event) {
				handler(params);
			}, 100);
		})
		.click(function(event) {
			handler(params);
		})
		.bind("mouseup", function(event) {
			clearInterval(this.interval);
		});
	}
};

// Initialise socket
socket.connect();
	
// Initialise UI
menu.init();
palette.init();

$("#delete").click(function(event) {
	socket.send("remove", drop.selected);
})
.button({
	icons: {
		primary: "ui-icon-trash"	
	},
	text: false
});

/*
$("#rotate").bind("mousedown", function(event) {
	this.interval = setInterval(function(event) {
		drop.rotate(drop.config.rotation);
	}, 100); 
})
.bind("mouseup", function(event) {
	clearInterval(this.interval);
})
.button({
	icons: {
		primary: "ui-icon-arrowrefresh-1-w"	
	},
	text: false
});
*/

$("#rotate").button({
	icons: {
		primary: "ui-icon-arrowrefresh-1-w"	
	},
	text: false
});	
button.binder($("#rotate"), drop.rotate, drop.config.rotation);

// Admin controls

$('#disconnect').click(function(event) {
	socket.close();
});

$("#reset").click(function(event) {
	socket.send("clear", null);
});
$("#clear").click(function(event) {
	$("#log").empty();
});


/*
$("#play").click(function(event) {
	drop.clear();
	socket.send("history", null);
})
.button();

$("#stop").click(function(event) {
	
	clearTimeout(play.timer);
	drop.clear();
	play.disabled = false;
	var timer = setTimeout(function() {
		socket.send("reset", null);
	}, 1000); 
})
.button();
*/
