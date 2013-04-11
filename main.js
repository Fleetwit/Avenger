var _cluster		= require('cluster');
var _os				= require('os');
var _ 				= require('underscore');

var main			= './avenger.js';
var options = {
	timeout:	60000		// if the process doesn't respond after this time, it is killed
}
var i;
var workers				= {};
var cpuCount			= _os.cpus().length;
_cluster.setupMaster({
    exec:	main
});

function processArgs() {
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

var args = processArgs();
for (i in args) {
	console.log("-> ",i,": ",args[i]);
}
if (!args.thread) {
	args.thread = 64;
}
args.thread = Math.min(args.thread*1, cpuCount);
for (var i = 0; i < args.thread; i++) {
    createWorker();
}

if (_cluster.isMaster) {
	if (options.timeout > 0) {
		setInterval(function() {
			var time = new Date().getTime();
			for (pid in workers) {
				if (workers[pid] && workers[pid].lastCheck + 5000 < time) {
					console.log("TIMEOUT: ", pid);
					workers[pid].worker.process.kill();
					delete workers[pid];
					createWorker();
				}
			}
		}, options.timeout);
	}
}

function createWorker() {
	var worker 	= _cluster.fork();
	console.log("New worker: ",worker.process.pid);
	workers[worker.process.pid] = {
		worker:		worker,
		lastCheck:	new Date().getTime()-1000	// allow boot time
	};
	worker.on('message', function(data) {
		if (workers[worker.process.pid] && workers[worker.process.pid].lastCheck) {
			workers[worker.process.pid].lastCheck = new Date().getTime();
		}
		
	});
	
};

