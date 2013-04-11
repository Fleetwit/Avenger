var wssClient 	= require('ws');
var _ 				= require('underscore');

function simpleclient(host, port, options) {
	var scope 		= this;
	this.host 		= host;
	this.port 		= port;
	this.options 	= _.extend({
		onConnect:		function() {},
		onReceive:		function() {},
		onFail:			function() {},
		onClose:		function() {},
		keepalive:		true,
		reconnect:		true,
		onConnect:		function(reconnected) {},
		onReceive:		function(message) {},
		onClose:		function() {},
		interval:		{
			keepalive:	30000
		}
	}, options);
	this.wss 		= new wssClient("ws://"+host+":"+port);
	try {
		this.wss.on('open', function() {
			//scope.log("CONNECTED", "ws://"+host+":"+port);
			scope.options.onConnect(scope);
		});
		this.wss.on('message', function(message) {
			//scope.log("RECEIVING", scope.wsdecode(message));
			//console.log("> message",message);
			scope.options.onReceive(scope, scope.wsdecode(message));
		});
		this.wss.on('close', function(code) {
			//scope.log("CLOSED", code);
			scope.options.onClose(scope, code);
		});
		this.wss.on('error', function(message) {
			if (message.code == "ECONNREFUSED") {
				scope.log("ERROR", "Connection Refused");
			} else {
				scope.log("ERROR", message, message.code);
			}
				scope.options.onFail(scope, message);
		});
	} catch(e) {
		console.log("error :(",e);
	}
}
simpleclient.prototype.send = function(data) {
	this.wss.send(this.wsencode(data));
}
simpleclient.prototype.close = function() {
	this.wss.close();
}
simpleclient.prototype.log = function(data, data2) {
	var red, blue, reset;
	red   = '\u001b[31m';
	blue  = '\u001b[34m';
	reset = '\u001b[0m';
	console.log(red+"<CLIENT@"+this.host+":"+this.port+">");
	for (i in arguments) {
		console.log(reset, arguments[i],reset);
	}
}
simpleclient.prototype.wsencode = function(data) {
	return JSON.stringify(data);
}
simpleclient.prototype.wsdecode = function(data) {
	try {
		return JSON.parse(data);
	} catch (e) {
		return data;
	}
}

exports.simpleclient = simpleclient;


