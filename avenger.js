var _cluster		= require('cluster');
var _os				= require('os');
var _ 				= require('underscore');
var fs 				= require('fs');

var client 			= require('./node.awsi').client;
var server 			= require('./node.awsi').server;

var scenarios 		= require('./scenarios').scenarios;

var debug_mode		= true;

function avenger() {
	var scope 		= this;
	this.options 	= _.extend({
		n:			50,
		host:		"209.59.172.80",
		port:		8080,
		central:	false,
		keep:		true,
		interval:	100,
		nstart:		0,
		scenario:	"Load",
		simname:	"helloworld",
		control: {
			host:	"127.0.0.1",
			port:	8014
		}
	},this.processArgs());
	
	if (!this.options.thread) {
		this.options.thread = 64;
	}
	this.options.thread = Math.min(this.options.thread, _os.cpus().length);
	
	this.options.n = this.options.n*1;
	
	this.scenarios = scenarios(this);
	
	if (this.options.central) {
		console.log("Connecting...");
		this.client = new client({
			port:		this.options.control.port,
			host:		this.options.control.host,
			keepalive:	true,
			reconnect:	true,
			onConnect:	function(reconnected) {
				if (reconnected) {
					console.log("Reconnected to Central Command");
				} else {
					console.log("Connected to Central Command");
				}
				scope.client.send({
					available:	true
				}, false, true);
			},
			onReceive:	function(message) {
				if (message.exec) {
					scope.options = _.extend(scope.options,message.exec);
					scope.startTest();
				}
				if (message.running) {
					console.log("> Computer #"+message.wsid+" is currently running a simulation... Please wait...");
				}
				if (message.update) {
					console.log(message.update);
				}
			},
			onClose:	function() {
				
			}
		});
		this.client.connect();
	}
	
	if (this.options.start) {
		this.startTest();
	}
};

avenger.prototype.init = function() {
	var scope = this;
	this.startTest({});
};
avenger.prototype.startTest = function(options) {
	var scope = this;
	options	= _.extend({
		onConnect: 	function() {},
		onReceive:	function() {},
		onClose:	function() {}
	},options);
	
	this.clients 	= {};
	
	console.log("Starting test...");
	console.log("Connections: ", 						this.options.n);
	console.log("Scenario: ", 							this.options.scenario);
	console.log("Server: ", 							this.options.host+":"+this.options.port);
	console.log("Estimated Time to completion: ", 		(this.options.n*this.options.interval)+"ms ("+((this.options.n*this.options.interval)/1000)+"sec - "+((this.options.n*this.options.interval)/1000/60)+"min)");
	
	this.timeStart = new Date().getTime();
	
	// Init the scenario
	scope.scenarios[scope.options.scenario].onStart();
	
	this.conn = this.options.nstart;
	var lastpct = 0;
	this.connInterval = setInterval(function() {
		scope.conn++;
		var pct 	= Math.round((scope.conn-scope.options.nstart)/scope.options.n*100);	// substract nstart to keep the pct in range (when nstart > n)
		if (pct % 5 == 0 && lastpct != pct) {
			lastpct = pct;
			// recompute time left
			var elapsed 	= new Date().getTime() - scope.timeStart;
			var remaining 	= elapsed/pct*(100-pct);
			// Display
			console.log(pct+"% done (n="+(scope.conn-scope.options.nstart)+"/"+(scope.options.n)+", "+remaining+"ms remaining ("+Math.round(remaining/1000)+"sec - "+Math.round(remaining/1000/60)+"min)"+")");
			
			// Update the remote
			try {
				scope.client.send({
					update:	pct+"% done (n="+(scope.conn-scope.options.nstart)+"/"+(scope.options.n)+", "+remaining+"ms remaining ("+Math.round(remaining/1000)+"sec - "+Math.round(remaining/1000/60)+"min)"+")"
				}, false, true);
			} catch (e) {
				//console.log("err",e);
			}
		}
		scope.createClient(scope.conn);
		
		if (scope.conn-scope.options.nstart == scope.options.n) {
			clearInterval(scope.connInterval);
			scope.timeEnd 	= new Date().getTime();
			scope.timeTotal = scope.timeEnd - scope.timeStart;
			scope.displayStats();
			
		}
	}, this.options.interval);
};
avenger.prototype.createClient = function(i) {
	var scope 	= this;
	
	scope.scenarios[scope.options.scenario].onInit(i);

	this.clients[i] = new client({
		port:		this.options.port,
		host:		this.options.host,
		keepalive:	true,
		reconnect:	false,
		onConnect:	function(reconnected, instance) {
			scope.scenarios[scope.options.scenario].onConnect(i, instance);
		},
		onReceive:	function(message, instance) {
			scope.scenarios[scope.options.scenario].onReceive(i, instance, message);
		},
		onClose:	function(flag, instance) {
			if (flag) {
				scope.scenarios[scope.options.scenario].onClose(i, instance);
			} else {
				scope.scenarios[scope.options.scenario].onFail(i, instance);
			}
		}
	});
	this.clients[i].connect();
};
avenger.prototype.displayStats = function() {
	var scope = this;
	var i;
	var j;
	
	console.log("Sim time: ",this.timeTotal+"ms",(this.timeTotal/1000)+"sec");
	try {
		scope.client.send({
			update:	"Sim time: "+this.timeTotal+"ms ("+(this.timeTotal/1000)+"sec)"
		}, false, true);
	} catch (e) {
		//console.log("err",e);
	}
			
	// saving the stats
	if (this.options.savestats) {
		var idstring 	= this.options.simname; //this.options.scenario+"-"+this.options.host+"-"+this.options.port+"-"+this.options.n+"-"+(this.options.interval)+"-"+(this.options.thread);
		var logname 	= "stats/log/stats-"+idstring+"-"+process.pid+".json";
		
		// create output object
		this.stats.output = {};
		
		for (i in this.stats.speed) {
			this.stats.output[i] = [];
			var l 	= Math.max.apply(null, _.keys(this.stats.speed[i]));
			for (j=0;j<l;j++) {
				this.stats.output[i].push(0);
			}
			for (j in scope.stats.speed[i]) {
				this.stats.output[i][j] = scope.stats.speed[i][j];
			}
		}
		
		delete this.stats["temp"];
		
		fs.writeFile(logname, JSON.stringify(this.stats), function(err) {
			if(err) {
				console.log("Creating log file...");
			} else {
				console.log("Log exported.");
			}
		});
		fs.readFile("stats/log/log.json", 'utf8', function(err, data) {
			if (err) {
				console.log("Creating central log file...");
				data = {}
			} else {
				data = JSON.parse(data);
			}
			if (!data[idstring]) {
				data[idstring] = {};
			}
			//delete scope.stats["temp"];
			data[idstring][process.pid] = {
				host:	scope.options.host,
				port:	scope.options.port,
				conn:	scope.options.n,
				log:	scope.stats
			}
			
			try {
				var buffer = {};
				buffer[idstring] = {};
				buffer[idstring][process.pid] = {
					host:	scope.options.host,
					port:	scope.options.port,
					conn:	scope.options.n,
					log:	scope.stats
				}
				scope.client.send({
					stats: buffer
				}, false, true);
			} catch (e) {
				
			}
			// save log
			fs.writeFile("stats/log/log.json", JSON.stringify(data), function(err) {
				if(err) {
					console.log(err);
				} else {
					console.log("Central log updated.");
				}
			});
		});
	}
	
};
avenger.prototype.processArgs = function() {
	var i;
	var args 	= process.argv.slice(2);
	var output 	= {};
	for (i=0;i<args.length;i++) {
		var l1	= args[i].substr(0,1);
		if (l1 == "-") {
			if (args[i+1] == "true") {
				args[i+1] = true;
			}
			if (args[i+1] == "false") {
				args[i+1] = false;
			}
			if (!isNaN(args[i+1]*1)) {
				args[i+1] = args[i+1]*1;
			}
			output[args[i].substr(1)] = args[i+1];
			i++;
		}
	}
	return output;
};


var instance = new avenger();

/************************************/
/************************************/
/************************************/
// Process Monitoring
setInterval(function() {
	process.send({
		memory:		process.memoryUsage(),
		process:	process.pid
	});
}, 1000);

// Crash Management
if (!debug_mode) {
	process.on('uncaughtException', function(err) {
		console.log("uncaughtException",err);
	});
}


