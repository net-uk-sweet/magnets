/* globals jQuery, magnets, io */

/* socket.io "0.8.5" */

/* Author:
	Ian Watson
	
	[ ] CSS prefixes
	[ ] sound on drop
	[ ] prompt when only user
	[ ] click to remove selected
*/

/*
	Transition to angular (20 hours until no job!)
		[x] Review the client codez
		[x] Decide what actors I need
		[x] Review the server codez
		
		[ ] Rewrite server - express, latest socket.io
		[ ] Write a service to interact w/ it

		[ ] Better approach to selected magnet stuff?
		[ ] Custom version of jQuery UI w/ only drag and drop
		[ ] Plus NG bindings / directives whatever
		[ ] Find / prototype with drag and drop lib
		[ ] How to expose an API in angular to window?
*/

/*
	WebsocketService

	MagnetsView
	AdminView

	MenuDirective
	PaletteDirective
	ToolbarDirective
	DragDirective?
	DropDirective?
*/

(function(magnets, $, undefined) {
	
	'use strict';

	// -----------------------------------------------------------------------
	// The toolbar 
	// Bit strange as it represents the menu, palette and remove / rotate buttons
	// of which the first two are separate object, and the latter is not.

	var toolbar = {
		config: {
			
		},
		
		init: function(config) {
			$.extend(palette.config, config);
		
			$('#toolbar').fadeIn();

			// set up buttons with auto class to autofire
			$('button.auto').autofire({});

			$('#delete').button({
				icons: { primary: 'icon-trash' },
				text: false
			})
			.click(function(/*event*/) {
				drop.remove(drop.selected);
				socket.send('remove', drop.selected);
			});

			$('#rotate').button({
				icons: { primary: 'icon-cw' },
				text: false
			})
			.click(function(/*event*/) {
				drop.rotate(drop.config.rotation);
			});
			
			toolbar.setEnabled(false);
		},
		
		// Enables / disables palette and rotate / remove buttons
		setEnabled: function(enable) {
			
			enableButton('rotate', enable);
			enableButton('delete', enable);
			
			palette.setEnabled(enable);
		}
	};
	
	// -----------------------------------------------------------------------
	// The color palette menu

	var palette = {
		
		config: {
			_class: 'color',
			colors: {
				'red': '#ff0000',
				'green': '#00ff00',
				'yellow': '#ffff00',
				'blue': '#0000ff'
			}
		},
		
		init: function(config) {
			$.extend(palette.config, config);

			var colors = palette.config.colors;
			var _class = palette.config._class;

			// jQuery UI buttons aren't really needed. 
			$('.' + _class).button({
				icons: { primary: 'icon-record' },
				text: false
			}).click(function(/*event*/) {
				var id = this.id;
				drop.setColor(colors[id]);
				palette.setEnabled(true);
				enableButton(id, false);
			});
		},
		
		// Disables / enables the swatch associated w/ supplied hex value
		enableSwatch: function(hex, enable) {
			
			var colors = palette.config.colors;

			for (var color in colors) {
				if (colors[color] === hex) {
					enableButton(color, enable);
				}
			}
		},
		
		// Disables / enables all the swatches in the menu
		setEnabled: function(enable) {
			
			var colors = palette.config.colors;

			for (var color in colors) {
				enableButton(color, enable);
			}
		},
		
		// Gets a random color for an item on the menu
		getColor: function() {
			var colors = palette.config.colors;
		    var color;
		    var count = 0;

		    // WTF?
			for (var prop in colors) {
				if (Math.random() < 1/++count) {
					color = colors[prop];
				}
			}
		    return color;
		}
	};
	
	// -----------------------------------------------------------------------
	// The magnet selection menu

	/*
		http://stackoverflow.com/questions/16788964/how-to-loop-through-the-alphabet-via-underscorejs
		var alphas = _.range(
		    'a'.charCodeAt(0),
		    'z'.charCodeAt(0)+1
		); 
		// [97 .. 122]

		String.fromCharCode(alphas[n]);
	*/

	var menu = {
	
		index: 0,
		color: null,
		config: {
			// Could do this better. See above
			chars: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
				'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
				'x', 'y', 'z'
			],
			
			next: '#next',
			prev: '#prev'
		},
		
		init: function(config) {
			
			config = $.extend(menu.config, config);

			$(config.prev).button({
				icons: { primary: 'icon-left-dir' },
				text: false
			})
			.button('enable')
			.bind('click.autofire', function (/*event*/) {
				menu.prev();
			});
			
			$(config.next).button({
				icons: { primary: 'icon-right-dir' },
				text: false
			})
			.button('enable')
			.bind('click.autofire', function (/*event*/) {
				menu.next();
			});
				
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

			// The array of characters
			// TODO: should be able to iterate through character numbers instead
			var chars = menu.config.chars;
			
			// Get a random color
			menu.color = palette.getColor();
			
			// This would be better in the next / previous methods
			if (menu.index > chars.length - 1) {
				menu.index = 0;
			}
				
			if (menu.index < 0) {
				menu.index = chars.length - 1;
			}

			$('#character-selector').html(
				$('<span>' + chars[menu.index] + '<\/span>')
					.addClass('drag unselected')
					.attr('id', drop.added)
			);
				
			$('#character-selector span')
				.css('color', menu.color)
				.draggable({ tolerance: 'touch' });
		}
	};
	
	// -----------------------------------------------------------------------
	// The drop area

	var drop = {
		
		selected: '',
		items: [],
		added: 'added', // tmp id for new magnets
		config: {
			rotation: 15,
			lag: 8, // pixel resistance on the drag
			target: '#drop', // The area we can drop on
			out: '#wrapper' // Out of bounds area
		},
		
		init: function(data, config) {
			$.extend(socket.config, config);
			drop.items = data;
			
			// Populate the drop area with items received
			if (data) {
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
			
			var $target = $(drop.config.target),
				$this,
				$drag,
				$id,
				item,
				x, y;
			
			$target.droppable({
				accept: '.drag', // accept elements w/ this class
				tolerance: 'fit', // drag has to be completely over target area (no intersection)
				drop: function(event, ui) {
					
					//console.log('in');
					$this = $(this);
					$drag = ui.draggable;
					$id = $drag.attr('id');
					
					// This is a new item w/ temporary id
					if ($id === drop.added) {
						
						var offset = $this.offset();
	
						x = event.originalEvent.pageX - offset.left - ($drag.width() / 2);
						y = event.originalEvent.pageY - offset.top - ($drag.height() / 2);
						
						$this.append($drag);
						$drag.removeClass('unselected');
						
						// Create the model for the item
						item = {
							id: $id,
							v: $drag.contents().clone()[0].data,
							c: menu.color,
							x: x,
							y: y,
							r: drop.getRotation()
						};
						
						$drag.attr('id', item.id);
						menu.update();
	
						drop.setProps($drag, item);
						drop.items.push(item);
						
						socket.send('add', item);
					} else {
						// It's an existing item which has been moved within the target
						$drag.removeClass('selected');
						var position = $drag.position();
						$drag.addClass('selected');
						item = drop.getItem($id);
						item.x = position.left;
						item.y = position.top;
						drop.setSelected($id);
						socket.send('update', item);
					}
				}
			});
		},
		
		// Remove items dropped outside the board
		initOut: function() {
			
			$(drop.config.out).droppable({
				accept: '#' + drop.added,
				drop: function(event, ui) {
					//console.log('out');
					ui.draggable.remove();
					menu.update();
				}
			});
		},
		
		// Add an item to the board on init or on socket message
		addItem: function(item) {

			var $target = $(drop.config.target);
					
			if (!drop.getItem(item.id)) {
				drop.items.push(item);
			}

			$target.append(
				$('<span>' + item.v + '<\/span>')
					.addClass('drag')
					.attr('id', item.id)
			);
				
			drop.setProps($('#' + item.id), item);
		},
		
		// Called on update of item via socket
		update: function(data) {

			// This chunk is duplicated in setProps
			$('#' + data.id).css({
				'color': data.c,
				'left': data.x,
				'top': data.y,
				'-webkit-transform': 'rotate(' + data.r + 'deg)',
				'-moz-transform': 'rotate(' + data.r + 'deg)'
			});
				
			var item = drop.getItem(data.id);
			item.c = data.c;
			item.x = data.x;
			item.y = data.y;
			item.r = data.r;
		},
		
		// Remove all items and reset the array
		clear: function() {
			$(drop.config.target).children().remove();
			drop.items = [];
		},
		
		// Update temp id of just dropped item w/ guid assigned by server
		setID: function(id) {
			var item = drop.getItem('added');
			item.id = id;
			$('#added').attr('id', id);
			drop.setSelected(id);
		},
		
		// Set the color of an item, on change from palette 
		setColor: function(color) {
			$('#' + drop.selected).css('color', color);
			var item = drop.getItem(drop.selected);
			item.c = color;
			socket.send('update', item);
		},
		
		// Change item to selected state when clicked
		setSelected: function(id) {
			$('#' + drop.selected).removeClass('highlight');
			drop.selected = id;
			var item = drop.getItem(drop.selected);
			$('#' + id).addClass('highlight');
			toolbar.setEnabled(true);
			palette.enableSwatch(item.c, false);
			socket.send('selected', id);
		},
		
		// Reenable on socket message (other user had it selected, but no longer does)
		enable: function(id, enabled) {
			//console.log(id + ' enabled: ' + enabled);
			var $drag = $('#' + id);
			if (enabled) {
				$drag.draggable({'disabled': false})
					.click(drop.getClick());
					
			} else {
				$drag.draggable({'disabled': true})
					.unbind('click');
			}
		},
		
		// Wonder if some of these should be methods on the draggables?

		// Rotate an item on user rotate via toolbar
		rotate: function(rotation) {
			var $drag = $('#' + drop.selected);
			var item = drop.getItem(drop.selected);
				
			item.r = item.r + rotation;
			$drag.css({
				'-webkit-transform': 'rotate(' + item.r + 'deg)',
				'-moz-transform': 'rotate(' + item.r + 'deg)'
			});
			
			socket.send('update', item);
		},
		
		// Remove an item on user delete via toolbar
		remove: function(id) {
			var items = drop.items;
			var l = items.length;
			var i = 0;
			var item;
	
			$('#' + id).remove();
			toolbar.setEnabled(false);
			
			// Use underscore!
			while (i < l) {
				item = items[i];
				if (item.id === id) {
					items.splice(i, 1);
					return;
				}
					
				i ++;
			}
		},
		
		// Called on an item when added via this user or via socket message
		// Sets the CSS properties AND bindings on an item. Breaks SRP!
		setProps: function($drag, item) {
	
			$drag.css({
				'position': 'absolute',
				'color': item.c,
				'left': item.x,
				'top': item.y,
				'-webkit-transform': 'rotate(' + item.r + 'deg)',
				'-moz-transform': 'rotate(' + item.r + 'deg)'
			})
			.click(drop.getClick())
			.mouseover(function() {
				$('#board').css('overflow', 'visible');
			})
			.draggable({
				containment: drop.config.target,
				distance: drop.config.lag,
				scroll: false
			});
		},
		
		// Helper function which returns the callback for item clicks
		getClick: function() {
			return function() { drop.setSelected($(this).attr('id')); };
		},
		
		// Returns an item (data) for a given id
		getItem: function(id) {
			var items = drop.items;
			var l = items.length;
			var i = 0;
			var item;
		
			// underscore!!
			while (i < l) {
				item = items[i];
				if (item.id === id) {
					return item;
				}
				i ++;
			}
			return false;
		},
		
		// Returns a random but upright rotation for a new item added by this user
		getRotation: function() {
			return 330 + (Math.floor(Math.random() * 5) * drop.config.rotation);
		}
	};
	
	// -----------------------------------------------------------------------
	// Websockets handler

	var socket = {
		
		connection: '',
		disabled: false,
		config: {
			logger: '#log',
			users: '#users'
		},
		
		connect: function(config) {
			
			// Allows us to override built in config object
			$.extend(socket.config, config);
					
			try {

				// socket.io configuration
				socket.connection = io.connect(null, {
					'connect timeout': 5000,
					'try multiple transports': true,
					'reconnect': true,
					'reconnection delay': 500,
					'reopen delay': 3000,
					'max reconnection attempts': 10,
					'sync disconnect on unload': true,
					'auto connect': true,
					'remember transport': true,
					'transports': [
						'websocket',
						'flashsocket',
						'htmlfile',
						'xhr-multipart',
						'xhr-polling',
						'jsonp-polling'
					]
				});
				
				socket.connection.on('connect', function() {
					// Preloader stops, calls back and toolbars and drop are initialised
					$('#preloader').preloader('stop');
				});
				
				socket.connection.on('disconnect', function() {
					console.log('event', 'Socket status: closed!');
					// Clear the drop area and reset the model
					drop.clear();
				});
				
				socket.connection.on('reconnecting', function(delay, attempts) {
					console.log('event', 'Socket status: reconnection attempt ' + attempts);
				});
	
				socket.connection.on('reconnect', function() {
					console.log('event', 'Socket status: reconnected');
				});
				
				socket.connection.on('reconnect_failed', function() {
					console.log('event', 'Socket status: reconnect failed');
				});
				
				// Callback from messages pushed from socket
				socket.connection.on('message', function(msg) {
					
					// Types are outlined in handler object below
					var type = msg.type;
					var body = msg.body;

					console.log('message', 'Received message: ' + type +
						' : body : ' + JSON.stringify(body));
					
					var handler = {
						// The initial snapshot, maybe snapshot is a better name
						// since all of the messages are essentially pushed?
						'push': function() {
							var selected = body.selected;
							drop.init(body.items); // init the drop component w/ data
							socket.setCount(body.count);
							// Should drop not be handling this
							for (var i = 0; i < selected.length; i ++) {
								// enable all but selected items - of which there may be many
								drop.enable(selected[i], false);
							}
						},
						// Item has been added
						'add': function() {
							drop.addItem(body);
						},
						// Item on stage had been updated in some way
						// Moved, rotated, color changed etc.
						'update': function() {
							drop.update(body);
						},
						// Item on stage has been deleted
						'remove': function() {
							drop.remove(body);
						},
						// Item on stage has been selected
						'selected': function() {
							drop.enable(body.unselected, true);
							drop.enable(body.selected, false);
						},
						// When an item is added to the stage, server responds
						// with a guid to replace the temporary id assigned on 
						// the client
						'guid': function() {
							drop.setID(body);
						},
						// Half-baked feature, unused
						'history': function() {
							socket.disabled = true;
							history.start(body);
						},
						// Clear the stage
						'clear': function() {
							drop.clear();
						},
						// Updates count when a new user logs in
						'count': function() {
							socket.setCount(body);
						}
					};
					
					handler[msg.type]();
				});
			}
			catch(exception) {
				console.log('warning', 'Error receiving message', exception);
			}
		},
		
		send: function(type, body) {
			try {
				var json = JSON.stringify({type: type, body: body});
				socket.connection.send(json);
				console.log('event', 'Sent message: ' + type +
					' : body : ' + JSON.stringify(body));
			} catch(exception) {
				console.log('warning', 'Error sending message', exception);
			}
		},
	
		close: function() {
			socket.connection.disconnect();
		},
		
		setCount: function(count) {
			$(socket.config.users).html('(' + count.toString() + ')');
		}
	};
	
	// -----------------------------------------------------------------------
	// This is the app object exposed to the global namespace	

	magnets.init = function() {

		// hack to kill focus state on toolbar elements which appears to be impossible to override in CSS
		$('button').mouseup(function() {
			$(this).removeClass('ui-state-focus ui-state-hover ui-state-active');
		});
		
		$('#preloader').preloader({
			style: 'drag',
			delay: 1,
			rotation: drop.config.rotation,
			wait: true
		}).one('complete', function() {
			$(this).hide('slow', function() {
				magnets.render();
			});
		});
			
		socket.connect();
	};

	magnets.render = function() {

		// Initialise UI
		menu.init();
		palette.init();
		toolbar.init();
				
		$('#drop').fadeIn();
	};
	
	// Why on earth is this here? It's called from all over the place, but probably
	// doesn't naturally fit on any one object. The limitations of this approach are
	// starting to become obvious!!
	function enableButton(id, enable) {
		var method = enable ? 'enable' : 'disable';
		$('#' + id).button(method);
	}

}( window.magnets = window.magnets || {}, jQuery ));

// start it all up innit?
magnets.init();


