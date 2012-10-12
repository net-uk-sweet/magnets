// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; args.callee = args.callee.caller; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());


// place any jQuery/helper plugins in here, instead of separate, slower script files.

// pre-loader plugin
(function( $ ){

	var methods = {
		
		init : function( options ) {

			var settings = $.extend( {
				debug: false,
				text: 'loading',
				style: 'preloader',
				rotation: 15,
				colors: ['#ff0000', '#00ff00', '#ffff00', '#0000ff'], // TODO: could allow RGBA	
				delay: 3, // length of delay between transitions in seconds 
				spacing: 20,
				wait: false		 
			}, options);
			
			function wait($target) {
				
				var data = $target.data('preloader');				
				var stopped = false;
				
				if (data.count === settings.text.length + 1) {					
					if (!data.stop) {
						$target.empty();
						data.count = 0;
					} else {
						stopped = true; 
						$target.trigger('complete');						
					}
				}
				
				if (!stopped)
					data.timeout = setTimeout(show, data.delay * 1000, $target);	
			}

			function show($target) {
				
				var data = $target.data('preloader');
				var left = data.count * settings.spacing;
				
				var $magnet = $('<span class="' + settings.style + '">' 
					+ settings.text.substring(data.count ++, data.count) 
					+ '</span>');
				
				$magnet.css({
					'color': getColor(),	
					'-webkit-transform': 'rotate(' + getRotation() + 'deg)',
					'-moz-transform': 'rotate(' + getRotation() + 'deg)',
					'left': left
				});
				
				$target.append($magnet);
				wait($target);
			}			
			
			function getColor() {
				var colors = settings.colors;  
				return colors[Math.round(Math.random() * (colors.length - 1))]; 
			}
			
			function getRotation() {
				return 330 + (Math.floor(Math.random() * 5) * settings.rotation);
			}	
			
			return this.each(function() {		
			
				var $this = $(this);
			
				$this.data('preloader', {
					count: 0, 
					delay: settings.delay,
					stop: false,
					timeout: null
				});
				
				settings.wait ? wait($this) : show($this);
			});
		}, 
		
		stop: function( ) {
			
			return this.each(function() {
			
				var $this = $(this);
				
				var data = $this.data('preloader');
				data.stop = true;
				
				// Speed up now we're finished
				data.delay = 0.5;
			});
		}
	};

	$.fn.preloader = function( method ) {
	    
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.preloader' );
		}    
	};

})( jQuery );

// Simple plug-in to cycle through a list of colors and set them on an element
// Full-featured plug-in here: https://github.com/infusion/jQuery-xcolor
/*
(function( $ ){

	var methods = {
		
		init : function( options ) {

			var settings = $.extend( {
				debug: false,
				colors: ['#ff0000', '#00ff00', '#ffff00', '#0000ff'], // TODO: could allow RGBA
				easing: 'swing',
				shuffle: false, // true if colors array should be shuffled
				transitionSpeed: 1, // speed of transition in seconds		
				delay: 3, // length of delay between transitions in seconds
				wait: true // true if delay is required before first transition 		 
			}, options);
			
			var colors = settings.colors;

			function wait($target) {
				
				var data = $target.data('colorCycle');
				var colors = data.colors;				
				var delay = settings.delay;
				
				if (data.count == colors.length) {
					data.count = 0;
				}
				
				data.color = colors[data.count];
				data.animating = false;	
				data.timeout = setTimeout(animate, delay * 1000, $target);
			}

			function animate($target) {
				
				var data = $target.data('colorCycle');
				var transitionSpeed = settings.transitionSpeed;
				var easing = settings.easing;
				var colors = settings.colors;
				
				if (data) {
					data.animating = true;
					$target.stop().animate({color: data.colors[data.count ++]}, 
						transitionSpeed * 1000, easing, wait($target));
				}
			}			
			
			function shuffle(arr) {
				for (var j, x, i = arr.length; i; j = parseInt(Math.random() * i),
					x = arr[--i], arr[i] = arr[j], arr[j] = x);
				return arr;
			}
			
			return this.each(function() {		
			
				var $this = $(this);
				
				var count = 1;
				
				var colors = settings.shuffle 
					? shuffle(settings.colors) 
					: settings.colors;
				
				$this.css({'color': colors[0]});
				
				$this.data('colorCycle', {
					count: count, 
					colors: colors,
					timeout: null,
					animating: false
				});
				
				if (settings.wait) { wait($this);  } else { animate($this); }
			});
		}, 
		
		destroy: function( ) {
			
			return this.each(function() {
			
				var $this = $(this);
				var data = $this.data('colorCycle');
				var color = data.animating ? data.colors[data.count] 
					: data.colors[data.count - 1];
					
				$this.stop().css('color', color);
				
				// preserve hex value as $(element).css() won't necessarily return it
				data.color = color;  
				
				if (data && data.timeout !== undefined) 
					clearTimeout(data.timeout);
			});
		}
	};

	$.fn.colorCycle = function( method ) {
	    
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.colorCycle' );
		}    
	};

})( jQuery );
*/
// Button autofire plugin
(function( $ ){

	// TODO: use jquery easing functions

	var methods = {
		
		init : function( options ) {

			var settings = $.extend( {
				debug         	: false,
				event			: 'click',
				minSpeed		: 3,	// minimum number of events per second	
				maxSpeed		: 10,	// maximum number of events per second
				steps			: 10	// steps to reach maximum number of events per second 		 
			}, options);

			var timer;
			var frameDuration;
			var stepCount = 0;
			
			return this.each(function() {
   	
				var $this = $(this);
						
				$this.bind('mousedown', function (e) {
					startTimer($(this));							
				})
				.bind('mouseup mouseout', function (e) {
					stopTimer();
				});		
			});

			function startTimer($target) {
				
				var minSpeed = settings.minSpeed;
				var maxSpeed = settings.maxSpeed;
				
				var dspeed = maxSpeed - minSpeed;
				var steps = settings.steps;				
				 	
				timer = setTimeout(function () {
					if (stepCount) $target.trigger(settings.event); 
					stepCount = (stepCount == steps) ? steps : stepCount + 1;
					frameDuration = 1000 / (maxSpeed - (Math.cos((stepCount / steps) * (Math.PI / 2)) * dspeed));
					startTimer($target);
				}, stepCount ? frameDuration : 0);
			}
			
			function stopTimer() {
				stepCount = 0;
				clearTimeout(timer);	
			}
		}
	};

	$.fn.autofire = function( method ) {
	    
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.autofire' );
		}    
	};

})( jQuery );