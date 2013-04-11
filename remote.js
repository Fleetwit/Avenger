var _os				= require('os');
var _ 				= require('underscore');
var _server 		= require('./lib.simpleserver').simpleserver;


function remote() {
	var scope = this;
	this.server = new _server(8014, {
		onConnect:	function(client) {
			console.log("onConnect",client.uid);
		},
		onReceive:	function(client, data) {
			if (data.exec) {
				console.log("Broadcasting:",data);
				scope.server.broadcast(data);
			} else {
				console.log(">> ",data);
			}
			
		},
		onQuit:	function(client) {
			console.log("onConnect",client.uid);
		}
	});
}
new remote();