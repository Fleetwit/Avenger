var awsi = function(options) {
	this.options = $.extend({
		addr:		"ws://localhost:8080",
		keepalive:	true,
		reconnect:	true,
		onConnect:	function(reconnected) {},
		onReceive:	function(message) {},
		onClose:	function() {},
		interval:	{
			keepalive:	1000000
		}
	},options);
	
	this.execStart		= new Date().getTime();
	
	// status
	this.online			= false;	// Are we online?
	this.closeRequest	= false;	// Was the close requested?
	this.reconnecting	= false;	// Are we trying to reconnect already?
	this.reconnected	= false;	// Are we reconnected?
	
	// stack
	this.stack			= [];		// The stack
	this.stackRunning	= false;	// Is the stack currently running?
	
	// Hooks
	this.hooks			= {
		"onConnect":		{},
		"onReceive":		{},
		"onClose":			{}
	};
	
	// Websocket
	this.ws				= false;
};
awsi.prototype.connect = function() {
	var scope 			= this;
	this.closeRequest	= false;
	
	try {
		var url = this.options.addr[0];
		// Init the WebSocket
		if (window['MozWebSocket']) {
			this.ws = new MozWebSocket(url, []);
		} else if (window['WebSocket']) {
			this.ws = new WebSocket(url, []);
		} else {
			this.ws = false;
		}
	} catch (e) {
		console.log("Connection lost.");
		this.online = false;
	}
	
	// If Websocket
	if (this.ws) {
		$(this.ws).unbind();	// unbind from all previous events
		$(this.ws).bind('open', 	function(){scope.onConnect()});
		$(this.ws).bind('close', 	function(){scope.onClose()});
		$(this.ws).bind('message', 	function(e) {
			var data = e.originalEvent.data;
			if (typeof(data) != "object") {
				console.log("data::",data);
				data = JSON.parse(data);
			}
			scope.onReceive(data)
		});
		
		// Close the connection when we leave.
		$(window).unload(function(){
			scope.ws.close();
			scope.ws = null;
		});
		
	}
};
awsi.prototype.onConnect = function() {
	this.online			= true;
	this.stackRunning	= false;
	if (this.reconnecting) {
		this.reconnected = true;
	}
	this.reconnecting	= false;
	// Start the Keepalive
	this.keepAliveStart();
	// process hooks first
	var i;
	for (i in this.hooks["onConnect"]) {
		this.hooks["onConnect"][i](this.reconnected);
	}
	// process stack
	this.processStack();
	// 
	this.options.onConnect(this.reconnected);
	return this;
};
awsi.prototype.onReceive = function(data) {
	// process hooks first
	var i;
	for (i in this.hooks["onReceive"]) {
		this.hooks["onReceive"][i](data);
	}
	this.options.onReceive(data);
	return this;
};
awsi.prototype.onClose = function(data) {
	this.stackRunning	= false;
	this.online 		= false;
	this.ws				= false;
	console.log("this.closeRequest",this.closeRequest);
	// Stop the stack
	if (!this.closeRequest) {
		// unrequested close
		// Start the reconnection attempt
		this.reconnectStart();
	}
	this.closeRequest 	= false;
	
	// Stop the Keepalive
	this.keepAliveStop();
	// process hooks first
	var i;
	for (i in this.hooks["onClose"]) {
		this.hooks["onClose"][i](data);
	}
	this.options.onClose(this.closeRequest);
	return this;
};
awsi.prototype.hook = function(fn, name, callback) {
	if (!this.hooks[fn]) {
		this.hooks[fn] = {};
	}
	if (!this.hooks[fn][name]) {
		this.hooks[fn][name] = callback;
	}
	return this;
};
awsi.prototype.unhook = function(fn, name) {
	if (this.hooks[fn] && this.hooks[fn][name]) {
		delete this.hooks[fn][name];
	}
	return this;
};
awsi.prototype.send = function(data, async, now) {
	if (!now || !this.online || !this.ws) {
		this.stack.push({
			type:		"send",
			data:		data,
			async:		async
		});
	} else {
		data = JSON.stringify(data);
		this.ws.send(data);
	}
	this.processStack();
	return this;
};
awsi.prototype.ask = function(data, callback, async, now) {
	var scope = this;
	if (!now || !this.online) {
		this.stack.push({
			type:		"ask",
			data:		data,
			callback:	callback,
			async:		async
		});
	} else {
		// create unique ask_id
		var ask_id = uuid.v4();
		data.ask_id = ask_id;
		// set the hook
		this.hook("onReceive", "ask-"+ask_id, function(data) {
			if (data) {
				if (data.response_id == ask_id) {
					// remove the hook
					scope.unhook("onReceive", "ask-"+ask_id);
					// return the data
					callback(data);
				}
			}
		});
		// send the data, and wait for the answer
		this.send(data, false, true);
	}
	this.processStack();
	return this;
};
awsi.prototype.clearStack = function() {
	this.stack 			= [];		// reset the stack
	this.stackRunning	= false;	// stop the stack
	return this;
};
awsi.prototype.processStack = function() {
	var scope = this;
	if (this.stackRunning || this.stack.length == 0 || !this.online) {
		return this;
	}
	// Set the stack as being processed
	this.stackRunning = true;
	var item = _.clone(this.stack[0]);
	scope.stack.shift();	// Remove that item from the stack
	switch (item.type) {
		case "send":
			if (!item.async) {
				// Sync exec
				this.ask(item.data, function(data) {
					scope.stackRunning = false;
					scope.processStack();	// continue with the next element
				}, false, true);
			} else {
				// Async exec
				this.send(item.data, false, true);
				this.stackRunning = false;
			}
		break;
		case "ask":
			if (!item.async) {
				// Sync exec
				this.ask(item.data, function(data) {
					item.callback(data);
					scope.stackRunning = false;
					scope.processStack();	// continue with the next element
				}, false, true);
			} else {
				this.ask(item.data, item.callback, false, true);
				this.stackRunning = false;
			}
		break;
	}
	return this;
};
awsi.prototype.keepAliveStart = function() {
	var scope = this;
	if (!scope.options.keepalive) {
		return false;
	}
	// Stop previous timers
	window.clearInterval(this.timerKeepalive);
	// Start the timer
	this.timerKeepalive = window.setInterval(function() {
		if (scope.online && scope.ws) {
			scope.send({ping: true}, true, true);
		}
	}, this.options.interval.keepalive);
};
awsi.prototype.keepAliveStop = function() {
	window.clearInterval(this.timerKeepalive);
};
awsi.prototype.reconnectStart = function() {
	var scope 			= this;
	if (!this.options.reconnect || this.closeRequest) {
		return this;
	}
	if (this.reconnecting) {
		// Already processing a connection request...
		return this;
	}
	this.reconnecting 	= true;
	this.hook("onConnect", "reconnect", function(reconnected) {
		// We are reconnected
		// remove the hooks
		scope.unhook("onConnect", "reconnect");
		scope.unhook("onClose", "reconnect");
	});
	this.hook("onClose", "reconnect", function(reconnected) {
		// We are reconnected
		// remove the hook
		scope.unhook("onConnect", "reconnect");
		scope.unhook("onClose", "reconnect");
	});
	scope.connect();
	console.groupEnd();
};
awsi.prototype.reconnectStop = function() {
	this.reconnecting 	= false;
};
awsi.prototype.close = function() {
	this.closeRequest = true;
	this.ws.close();
	//this.onClose();
};

awsi.prototype.getExecTime = function() {
	return (new Date().getTime()-this.execStart)+"ms ("+Math.round((new Date().getTime()-this.execStart)/1000)+"sec)";
};

