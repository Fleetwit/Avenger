var wssClient 		= require('ws');
var _ 				= require('underscore');

function simpleclient(host, port, options) {
	var scope 		= this;
	this.host 		= host;
	this.port 		= port;
	this.options 	= _.extend({
		onConnect:		function() {},
		onReceive:		function() {},
		onFail:			function() {},
		onClose:		function() {}
	}, options);
	this.wss 		= new wssClient("ws://"+host+":"+port);
	try {
		this.wss.on('open', function() {
			scope.options.onConnect(scope);
		});
		this.wss.on('message', function(message) {
			scope.options.onReceive(scope, message);
		});
		this.wss.on('close', function(code) {
			scope.options.onClose(scope, code);
		});
		this.wss.on('error', function(message) {
			scope.options.onFail(scope, message);
		});
	} catch(e) {
		console.log("error :(",e);
	}
}
simpleclient.prototype.send = function(data) {
	this.wss.send(data);
}
simpleclient.prototype.close = function() {
	this.wss.close();
}

exports.simpleclient = simpleclient;