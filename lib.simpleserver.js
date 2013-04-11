var WebSocketServer 	= require('ws').Server;
var uuid 				= require('./lib.uuid');
var logger 				= require('./lib.logger').logger;

function simpleserver(port, options) {
	var scope 				= this;
	this.port 				= port;
	this.wss 				= new WebSocketServer({port: this.port});

	this.users				= {};
	this.count				= 0;	// Total number of connections, open or closed
	this.ocount				= 0;	// Total number of identified users
	
	this.alias				= "SERVER";
	if (options.alias) {
		this.alias			= options.alias;
	}
	
	this._version			= "1.0.0";
	
	this.options			= options;
	
	this.wss.on('connection', function(ws) {
		
		var uid 	= scope.onConnect(ws);
		
		ws.on('message', function(message) {
			scope.onReceive(ws, uid, scope.wsdecode(message));
		});
		
		ws.on('close', function(code, message) {
			scope.onClose(ws, uid, message);
		});
		ws.on('error', function(code, message) {
			scope.log("error");
		});
	});
}



/****************
	ON CONNECT
****************/
simpleserver.prototype.onConnect = function(ws) {
	this.count++;
	this.ocount++;
	
	var uid 	= uuid.v4(); //this.count;	//  internal uid
	
	this.users[uid]	= {
		ws:		ws
	};
	
	this.options.onConnect({
		ws:		ws,
		uid:	uid
	});
	
	return uid;
}




/****************
	ON RECEIVE
****************/
simpleserver.prototype.onReceive = function(ws, uid, message) {
	this.options.onReceive({
		ws:		ws,
		uid:	uid
	}, message);
}



/****************
	ON CLOSE
****************/
simpleserver.prototype.onClose  = function(ws, uid, message) {
	//this.ccount--;
	this.ocount--;
	
	delete this.users[uid];
	
	this.options.onQuit({
		ws:		ws,
		uid:	uid
	});
}





/****************
	WS:SEND
****************/
simpleserver.prototype.send = function(uid, data) {
	this.users[uid].ws.send(this.wsencode(data));
}



/****************
	WS:CLOSE
****************/
simpleserver.prototype.close = function(uid) {
	this.users[uid].ws.close();
}




/****************
	WS:BROADCAST
****************/
simpleserver.prototype.broadcast = function(data, except) {
	var i;
	var j;
	var l;
	data = this.wsencode(data);
	// make the list
	var list = {};
	if (except != undefined && except.length > 0) {
		// clone the user list
		for(var keys = Object.keys(this.users), l = keys.length; l; --l) {
			list[ keys[l-1] ] = this.users[ keys[l-1] ];
		}
		// remove the exceptions
		l = except.length;
		for (j=0;j<l;j++) {
			delete list[except[j]];
		}
	} else {
		list = this.users;
	}
	// broadcast
	for (i in list) {
		try {
			list[i].ws.send(data);
		} catch(e) {
			// failed
		}
	}
	
}
simpleserver.prototype.wsencode = function(data) {
	return JSON.stringify(data);
}
simpleserver.prototype.wsdecode = function(data) {
	try {
		return JSON.parse(data);
	} catch (e) {
		this.log("Non encoded data: ",data);
		return data;
	}
}


exports.simpleserver = simpleserver;