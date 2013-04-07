var _cluster		= require('cluster');
var _os				= require('os');
var _ 				= require('underscore');
var _logger 		= require('./lib.logger').logger;
var _stack 			= require('./lib.stack').stack;
var simpleclient 	= require('./simpleclient').simpleclient;

var debug_mode		= true;

function avenger() {
	var scope 		= this;
	this.options 	= _.extend({
		n:		50,
		host:	"localhost",
		port:	8080
	},this.processArgs());
	this.options.n = this.options.n*1;
	console.log("this.options",this.options);
	this.init();
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
	this.stats		= {
		done:		0,
		open:		0,
		close:		0,
		receive:	0,
		fail:		0,
		timer:		[]
	};
	for (i=0;i<this.options.n;i++) {
		this.createClient(options, i);
	}
};
avenger.prototype.createClient = function(options, i) {
	var scope 	= this;
	var timer	= {
		init:		new Date().getTime(),
		connect:	0,
		fail:		0
	};
	this.clients[i] = new simpleclient(this.options.host,this.options.port,{
		onConnect:	function(instance) {
			timer.connect	= new Date().getTime();
			scope.stats.timer.push(timer);
			scope.stats.open++;
			scope.stats.done++;
			if (scope.stats.done == scope.options.n) {
				scope.displayStats();
			}
			//instance.close();
		},
		onClose:	function(instance) {
			scope.stats.close++;
		},
		onFail:	function(instance) {
			timer.fail	= new Date().getTime();
			scope.stats.timer.push(timer);
			scope.stats.fail++;
			scope.stats.done++;
			if (scope.stats.done == scope.options.n) {
				scope.displayStats();
			}
		},
		onReceive:	function(instance, message) {
			scope.stats.receive++;
		}
	});
};
avenger.prototype.displayStats = function() {
	console.log("---------- "+process.pid+" ----------");
	console.log("DONE:\t\t", 	this.stats.done);
	console.log("OPEN:\t\t", 	this.stats.open);
	console.log("CLOSE:\t\t", 	this.stats.close);
	console.log("FAIL:\t\t", 	this.stats.fail);
	console.log("RECEIVE:\t", 	this.stats.receive);
	
	// Process times
	var total	= {
		connect:	0,
		fail:		0
	};
	var count	= {
		connect:	0,
		fail:		0
	};
	var i;
	var l = this.stats.timer.length;
	for (i=0;i<l;i++) {
		if (this.stats.timer[i].connect > 0) {
			total.connect += this.stats.timer[i].connect-this.stats.timer[i].init;
			count.connect++;
		}
		if (this.stats.timer[i].fail > 0) {
			total.fail += this.stats.timer[i].fail-this.stats.timer[i].init;
			count.fail++;
		}
	}
	var average	= {
		connect:	count.connect>0?total.connect/count.connect:0,
		fail:		count.fail>0?total.fail/count.fail:0
	};
	
	console.log("AVG CONNECT:\t", 		average.connect+"ms");
	console.log("AVG FAIL:\t", 			average.fail+"ms");
	
	
};
avenger.prototype.processArgs = function() {
	var i;
	var args 	= process.argv.slice(2);
	var output 	= {};
	for (i=0;i<args.length;i++) {
		var l1	= args[i].substr(0,1);
		if (l1 == "-") {
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


