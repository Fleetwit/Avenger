var _ 				= require('underscore');
var wssServer 		= require('ws').Server;
var wssClient 		= require('ws');
var uuid 			= require('./lib.uuid');

var awsi = {};

awsi.server	= function(options) {
	this.options = _.extend({
		port:		8080,
		onConnect:	function(){},
		onClose:	function(){},
		onReceive:	function(){},
		onFail:		function(){}
	},options);
	
	var scope 		= this;
	
	this.clients 	=  {};
	this.count 		= 0;
	this.tcount 	= 0;
	
	this.wss 				= new wssServer({port: this.options.port});
	
	this.wss.on('connection', function(ws) {
		
		var uid 	= scope.onConnect(ws);
		scope.options.onConnect(uid);
		
		ws.on('message', function(message, flag) {
			message = JSON.parse(message);
			if (message.echo) {				// echo
				scope.send(uid,{echo: message.echo});
			} else if (message.ping) {		// ping
				scope.send(uid,{pong: true});
			} else if (message.broadcast) {	// broadcast
				scope.broadcast(message.broadcast);
			} else {						// custom processing
				scope.options.onReceive(uid, message, flag);
			}
		});
		ws.on('close', function(code, message) {
			scope.count--;
			delete scope.clients[uid];
			scope.options.onClose(uid, code, message);
		});
		ws.on('error', function(code, message) {
			scope.options.onFail(uid, code, message);
		});
	});
}
awsi.server.prototype.onConnect = function(ws) {
	this.count++;
	this.tcount++;
	
	// register the client
	this.clients[this.tcount] = {
		uid: 	this.tcount,
		ws:		ws
	};
	
	return this.tcount;
}
awsi.server.prototype.send = function(uid, data) {
	data = JSON.stringify(data);
	this.clients[uid].ws.send(data);
}
awsi.server.prototype.close = function(uid) {
	this.clients[uid].ws.close();
}
awsi.server.prototype.broadcast = function(data, except) {
	var i;
	var j;
	var l;
	// make the list
	var list = {};
	if (except != undefined && except.length > 0) {
		// clone the user list
		for(var keys = Object.keys(this.users), l = keys.length; l; --l) {
			list[ keys[l-1] ] = this.clients[ keys[l-1] ];
		}
		// remove the exceptions
		l = except.length;
		for (j=0;j<l;j++) {
			delete list[except[j]];
		}
	} else {
		list = this.clients;
	}
	// broadcast
	for (i in list) {
		try {
			this.send(list[i].uid, data);
		} catch(e) {
			// failed
		}
	}
}

















awsi.client	= function(options) {
	this.options = _.extend({
		host:		"127.0.0.1",
		port:		8080,
		onConnect:	function(){},
		onClose:	function(){},
		onReceive:	function(){},
		onFail:		function(){},
		keepalive:	true,
		reconnect:	true,
		onConnect:	function(reconnected) {},
		onReceive:	function(message) {},
		onClose:	function() {},
		interval:	{
			keepalive:	3000
		}
	},options);
	
	var scope 		= this;
	
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
	
	
}
awsi.client.prototype.connect = function() {
	var scope 			= this;
	this.closeRequest	= false;
	
	this.ws 		= new wssClient("ws://"+this.options.host+":"+this.options.port);
	try {
		this.ws.on('open', function() {
			//console.log("Connected ("+scope.options.host+":"+scope.options.port+")");
			scope.onConnect();
		});
		this.ws.on('message', function(data) {
			if (typeof(data) != "object") {
				data = JSON.parse(data);
			}
			scope.onReceive(data)
		});
		this.ws.on('close', function(code) {
			scope.onClose();
		});
		this.ws.on('error', function(message) {
			if (message.code == "ECONNREFUSED") {
				//console.log("ERROR", "Connection Refused");
			} else {
				//console.log("ERROR", message, message.code);
			}
			scope.onClose();
		});
	} catch(e) {
		console.log("error :(",e);
	}
	
};
awsi.client.prototype.onConnect = function() {
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
	this.options.onConnect(this.reconnected, this);
	return this;
};
awsi.client.prototype.onReceive = function(data) {
	// process hooks first
	var i;
	for (i in this.hooks["onReceive"]) {
		this.hooks["onReceive"][i](data);
	}
	this.options.onReceive(data, this);
	return this;
};
awsi.client.prototype.onClose = function(data) {
	this.stackRunning	= false;
	this.online 		= false;
	this.ws				= false;
	this.reconnecting	= false;
	
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
	this.options.onClose(this.closeRequest, this);
	return this;
};
awsi.client.prototype.hook = function(fn, name, callback) {
	if (!this.hooks[fn]) {
		this.hooks[fn] = {};
	}
	if (!this.hooks[fn][name]) {
		this.hooks[fn][name] = callback;
	}
	return this;
};
awsi.client.prototype.unhook = function(fn, name) {
	if (this.hooks[fn] && this.hooks[fn][name]) {
		delete this.hooks[fn][name];
	}
	return this;
};
awsi.client.prototype.send = function(data, async, now) {
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
awsi.client.prototype.broadcast = function(data, async, now) {
	if (!now || !this.online || !this.ws) {
		this.stack.push({
			type:		"broadcast",
			data:		data,
			async:		async
		});
	} else {
		
		data = JSON.stringify({broadcast:data});
		this.ws.send(data);
	}
	this.processStack();
	return this;
};
awsi.client.prototype.ask = function(data, callback, async, now) {
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
awsi.client.prototype.clearStack = function() {
	this.stack 			= [];		// reset the stack
	this.stackRunning	= false;	// stop the stack
	return this;
};
awsi.client.prototype.processStack = function() {
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
		case "broadcast":
			this.broadcast(item.data, false, true);
			this.stackRunning = false;
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
awsi.client.prototype.keepAliveStart = function() {
	var scope = this;
	if (!scope.options.keepalive) {
		return false;
	}
	// Stop previous timers
	clearInterval(this.timerKeepalive);
	// Start the timer
	this.timerKeepalive = setInterval(function() {
		if (scope.online && scope.ws) {
			scope.send({ping: true}, true, true);
		}
	}, this.options.interval.keepalive);
};
awsi.client.prototype.keepAliveStop = function() {
	clearInterval(this.timerKeepalive);
};
awsi.client.prototype.reconnectStart = function() {
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
};
awsi.client.prototype.reconnectStop = function() {
	this.reconnecting 	= false;
};
awsi.client.prototype.close = function() {
	this.closeRequest = true;
	this.ws.close();
	//this.onClose();
};

awsi.client.prototype.getExecTime = function() {
	return (new Date().getTime()-this.execStart)+"ms ("+Math.round((new Date().getTime()-this.execStart)/1000)+"sec)";
};














exports.server = awsi.server;
exports.client = awsi.client;