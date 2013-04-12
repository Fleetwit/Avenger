var _os				= require('os');
var _ 				= require('underscore');
var fs 				= require('fs');

var client 			= require('./node.awsi').client;
var server 			= require('./node.awsi').server;


function remote() {
	var scope = this;
	
	this.clients 		= [];
	this.currentIndex 	= 0;
	this.currentData	= {};
	this.nstart			= 0;
	
	this.server = new server({
		port:		8014,
		onConnect:	function(wsid) {
			
		},
		onReceive:	function(wsid, data, flag) {
			// available client for the simulation
			if (data.available) {
				console.log("online: ",wsid);
				
				scope.clients.push({
					wsid: 	wsid,
					online:	true
				});
				
				scope.server.send(wsid, "You are number #"+wsid+" on the list");
			}
			// Client sending an update on the sim
			if (data.update) {
				console.log(data.update);
				
				scope.server.broadcast(data, [wsid]);
			}
			// Exec command from the remote
			if (data.exec) {
				console.log("*********************");
				console.log("SIMULATION REQUEST");
				console.log(data.exec);
				console.log("*********************");
				scope.startSim(data.exec);
			}
			// Client sending over the stats from their share of the sim
			if (data.stats) {
				// Save the stats
				scope.saveStats(data.stats);
				// process next part of the simulation
				scope.currentIndex++;
				scope.nstart	+= scope.currentData.n;
				scope.processNext();
			}
		},
		onClose:	function(wsid) {
			var i;
			console.log("client #"+wsid+" quit.");
			for (i=0;i<scope.clients.length;i++) {
				if (scope.clients[i] == wsid) {
					scope.clients[i].online = false;
				}
			}
		}
	});
}
remote.prototype.startSim = function(data) {
	var scope = this;
	this.currentIndex 	= 0;
	this.currentData	= data;
	this.processNext();
};
remote.prototype.processNext = function() {
	var scope = this;
	
	// If we reach the end of the list...
	if (this.currentIndex >= this.clients.length) {
		console.log("Simulation done. No more clients available.");
		this.server.broadcast({
			update: 	"Simulation done. No more clients available."
		});
		return false;
	}
	
	// if the next user is offline, skip
	if (!this.clients[this.currentIndex] || !this.clients[this.currentIndex].online) {
		this.currentIndex++;
		this.processNext();
		return false;
	}
	
	// Upgrade the number of current connection
	this.currentData.nstart = scope.nstart;
	
	console.log("Client #"+this.clients[this.currentIndex].wsid+" starting simulation...");
	this.server.broadcast({
		update: 	"Client #"+this.clients[this.currentIndex].wsid+" starting simulation..."
	});
	
	// Send the command to the user
	this.server.send(this.clients[this.currentIndex].wsid, {
		exec: this.currentData
	})
	// Let other clients that a simulation is in process
	this.server.broadcast({
		running: 	this.currentData,
		wsid:		this.clients[this.currentIndex].wsid
	}, [this.clients[this.currentIndex].wsid]);
	
};
remote.prototype.saveStats = function(stats) {
	var scope = this;
	
	var idstring 	= this.currentData.simname;
	var logname 	= "stats/log/_stats-"+idstring+".json";
	
	fs.writeFile(logname, JSON.stringify(stats), function(err) {
		if(err) {
			console.log("Creating log file...");
		} else {
			console.log("Log exported.");
		}
	});
	fs.readFile("stats/log/_log.json", 'utf8', function(err, data) {
		if (err) {
			console.log("Creating central log file...");
			data = {}
		} else {
			data = JSON.parse(data);
		}
		
		//delete scope.stats["temp"];
		for (n in stats) {
			if (!data[n]) {
				data[n] = {}
			}
			for (p in stats[n]) {
				if (!data[n][p]) {
					data[n][p] = {}
				}
				data[n][p] = stats[n][p];
			}
		}
		
		// save log
		fs.writeFile("stats/log/_log.json", JSON.stringify(data), function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log("Central log updated.");
			}
		});
	});
	
};
new remote();