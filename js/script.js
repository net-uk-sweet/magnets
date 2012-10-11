/* Author:
	Ian Watson
	
	TODO: sound on drop
	TODO: prompt when only user
*/

(function( magnets, $, undefined ) {
	
	var toolbar = {
		config: {
			
		},
		
		init: function(config) {
			$.extend(palette.config, config);		
		
			var $toolbar = $('#toolbar');
			var $frame = $('#frame');
			var timer; 
			
			// Check if mouse is already over frame	
			if ($frame.data('hover'))
				$toolbar.fadeIn();
				
			// Fade toolbar in and out if mouse is over whiteboard
			$frame.hover(
				function(event) {
					$toolbar.data('hover', true); 
					$toolbar.stop().fadeTo('slow', 1); 
				}, 
				function(event) { 
					$toolbar.data('hover', false);
					clearTimeout(timer); 
					timer = setTimeout(function() { 
						if (!$toolbar.data('hover'))
							$toolbar.stop().fadeOut('slow', 0);
					}, 1500)
				}
			);

			// set up buttons with auto class to autofire
			$('button.auto').autofire({});

			$('#delete').button({
				icons: { primary: 'icon-trash' },
				text: false
			})
			.click(function(event) {
				drop.remove(drop.selected);
				socket.send('remove', drop.selected);
			});

			$('#rotate').button({
				icons: { primary: 'icon-cw' },
				text: false
			})
			.click(function (event) {
				drop.rotate(drop.config.rotation);
			});	
			
			toolbar.setEnabled(false);
		}, 
		
		setEnabled: function(enable) {
			
			enableButton('rotate', enable);
			enableButton('delete', enable);
			
			palette.setEnabled(enable);
		}
	}
	
	var palette = {
		
		config: {
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
			for (var color in colors) {
				$('#' + color).click(function(event) {
					var id = this.id
					drop.setColor(colors[id]);
					palette.setEnabled(true);
					enableButton(id, false);
				})
				.button({
					icons: { primary: 'icon-record' },
					text: false
				});
			}
		},
		
		enableSwatch: function(hex, enable) {
			
			var colors = palette.config.colors;

			for (var color in colors) {
				if (colors[color] === hex) {
					enableButton(color, enable)
				}
			}
		},
		
		setEnabled: function(enable) {
			
			var colors = palette.config.colors;

			for (var color in colors)
				enableButton(color, enable);
		}, 
	};
	
	var menu = {
	
		index: 0,
		config: {
			chars: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 
				'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
				'x', 'y', 'z'
			],		
			
			next: '#next',
			prev: '#prev'	
		},
		
		init: function(config) {
			$.extend(menu.config, config);
			var config = menu.config;
			
			$(config.prev).button({
				icons: { primary: 'icon-left-dir' }, 
				text: false
			})
			.button('enable')
			.bind('click.autofire', function (event) {
				menu.prev();
			});
			
			$(config.next).button({
				icons: { primary: 'icon-right-dir' },
				text: false
			})
			.button('enable')
			.bind('click.autofire', function (event) {
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

			var chars = menu.config.chars;
			
			if (menu.index > chars.length - 1)
				menu.index = 0;
				
			if (menu.index < 0)
				menu.index = chars.length - 1;

			$('#character-selector').html(
				$('<span>' + chars[menu.index] + '<\/span>')
					.addClass('drag unselected')
					.attr('id', drop.added)
			);
				
			$('#character-selector span')
				.colorCycle({
					'shuffle': true, 
					'wait': true,
					'delay': 2
				})	
				.draggable({ tolerance: 'touch' })
				.click(function() {
					var $this = $(this);
					if ($this.attr('id') === drop.added) {
						$this.css('color', '#cccccc')
							.colorCycle('destroy');	
					}
				});
		}
	};
	
	var drop = {
		
		selected: '',
		items: [],
		added: 'added', // tmp id for new magnets
		config: {
			rotation: 15,
			lag: 8, // pixel resistance on the drag
			target: '#drop',
			out: '#wrapper'
		},
		
		init: function(data, config) {
			$.extend(socket.config, config);
			drop.items = data;
			
			if (data) {
				var html = '';
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
				accept: '.drag',
				tolerance: 'fit',
				drop: function(event, ui) {
					
					//console.log('in');
					$this = $(this);	
					$drag = ui.draggable;
					$id = $drag.attr('id');
					
					$('#board').css('overflow', 'hidden');
					
					if ($id === drop.added) {
						
						var offset = $this.offset();
	
						// It's a new magnet
						x = event.originalEvent.pageX - offset.left - ($drag.width() / 2); 
						y = event.originalEvent.pageY - offset.top - ($drag.height() / 2); 
						
						$this.append($drag);
						$drag.colorCycle('destroy').removeClass('unselected');
											
						item = {
							id: $id,
							v: $drag.contents().clone()[0].data,
							c: $drag.data('colorCycle').color,
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
						// It's been moved within the target
						var position = $drag.position();
						item = drop.getItem($id);
						item.x = position.left;
						item.y = position.top;
						drop.setSelected($id);
						socket.send('update', item);
					}
				}
			});
		},
		
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
		
		addItem: function(item) {
			var $target = $(drop.config.target);
			var $drag;
					
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
	
		update: function(data) {
			$('#' + data.id) 
				.css('color', data.c)
				.css('left', data.x)
				.css('top', data.y)
				.css('-webkit-transform', 'rotate(' + data.r + 'deg)')
				.css('-moz-transform', 'rotate(' + data.r + 'deg)');
				
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
			var item = drop.getItem('added');
			item.id = id;
			$('#added').attr('id', id);
			drop.setSelected(id);
		},
		
		setColor: function(color) {
			$('#' + drop.selected).css('color', color);				
			var item = drop.getItem(drop.selected);
			item.c = color;
			socket.send('update', item);
		},
		
		setSelected: function(id) {
			$('#' + drop.selected).removeClass('highlight');
			drop.selected = id;
			var item = drop.getItem(drop.selected);
			$('#' + id).addClass('highlight');
			toolbar.setEnabled(true);
			palette.enableSwatch(item.c, false);
			socket.send('selected', id);
		},
		
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
		
		remove: function(id) {
			var items = drop.items;
			var l = items.length;
			var i = 0;
			var item;
	
			$('#' + id).remove();
			toolbar.setEnabled(false);
			
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
	
			$drag.css('position', 'absolute')
				.css('color', item.c)
				.css('left', item.x)
				.css('top', item.y)
				.css('-webkit-transform', 'rotate(' + item.r + 'deg)')
				.css('-moz-transform', 'rotate(' + item.r + 'deg)')
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
		
		getClick: function() {
			return function() { drop.setSelected($(this).attr('id')); };
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
				
				//socket.connection = io.connect();
				
				// Set initial not ready message
				socket.log('event', 'Socket status: closed');
	
				socket.connection.on('connect', function() {
					//socket.log('event', 'Socket status: open');
					$('#preloader').preloader('stop');
				});
				
				socket.connection.on('disconnect', function() {
					socket.log('event', 'Socket status: closed!');
					drop.clear();
				});
				
				socket.connection.on('reconnecting', function(delay, attempts) {
					socket.log('event', 'Socket status: reconnection attempt ' + attempts);
				});
	
				socket.connection.on('reconnect', function() {
					socket.log('event', 'Socket status: reconnected');
				});
				
				socket.connection.on('reconnect_failed', function() {
					socket.log('event', 'Socket status: reconnect failed');	
				});
				
				socket.connection.on('message', function(msg) {
					
					var type = msg.type;
					var body = msg.body;

					socket.log('message', 'Received message: ' + type 
						+ ' : body : ' + JSON.stringify(body));
					
					var handler = {
						'push': function() {
							var selected = body.selected;
							drop.init(body.items);
							socket.setCount(body.count);
							for (var i = 0; i < selected.length; i ++) {
								drop.enable(selected[i], false);
							}
						},
						'add': function() {
							drop.addItem(body);
						},
						'update': function() {
							drop.update(body);
						}, 
						'remove': function() {
							drop.remove(body);
						},
						'selected': function() {
							drop.enable(body.unselected, true);
							drop.enable(body.selected, false);
						},
						'guid': function() {
							drop.setID(body);
						},
						'history': function() {
							socket.disabled = true;
							history.start(body);
						},
						'clear': function() {
							drop.clear();	
						},	
						'count': function() {
							socket.setCount(body);
						}					
					};
					
					handler[msg.type]();
				});								
			} 
			catch(exception) {
				socket.log('warning', 'Error' + exception);
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
			msg = '<p class="' + type + '">' + msg + '<\/p>';
	
			($logger.html() == '') 
				? $logger.html(msg) 
				: $logger.prepend(msg);
		},
		
		setCount: function(count) {
			$(socket.config.users).html("(" + count.toString() + ") ");			
		}
	};
	
	magnets.init = function() {	

		// Keep a record of whether mouse is over so we 
		// can show the toolbar if necessary when app has loaded
		$('#frame').hover(
			function(event) { $(this).data('hover', true); }, 
			function(event) { $(this).data('hover', false); }
		);
		
		// hack to kill focus state which appears to be impossible to override in CSS
		$("button").mouseup(function() {
			$(this).removeClass('ui-state-focus ui-state-hover ui-state-active');
		});
		
		$('#preloader').preloader({
			style: 'drag',
			delay: 1,
			rotation: drop.config.rotation, 
			wait: true
		}).one('complete', function() {
			$(this).hide('slow', function() {
				render();
			});
		});
			
		socket.connect();	
	};
	
	function enableButton(id, enable) {
		var method = enable ? 'enable' : 'disable';
		$('#' + id).button(method);
	};
	
	function render() {
		
		// Initialise UI
		menu.init();
		palette.init();
		toolbar.init();
				
		$('#drop').fadeIn();	
	};
	
	
		
	// Admin controls
	
	$('#disconnect').click(function(event) {
		socket.close();
	});
	
	$('#reset').click(function(event) {
		socket.send('clear', null);
	});
	$('#clear').click(function(event) {
		$('#log').empty();
	});

}( window.magnets = window.magnets || {}, jQuery ));

// start it all up innit?
magnets.init();


