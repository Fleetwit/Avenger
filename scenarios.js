var scenarios = function(scope) {
	return {
		Load:	{
			onStart:	function() {
				scope.stats = {
					_open:		0,
					_fail:		0,
					_close:		0,
					_receive:	0,
					temp:		{
						init:		{},
						send:		{},
					},
					speed:		{
						open:		{},
						close:		{},
						fail:		{},
						receive:	{}
					}
					
				};
			},
			onInit:		function(n) {
				try {
					scope.stats.temp.init[n] = new Date().getTime();
				} catch(e) {
					
				}
			},
			onConnect: 	function(n, instance) {
				try {
					scope.stats._open++;
					scope.stats.speed.open[n] = new Date().getTime()-scope.stats.temp.init[n];
					scope.stats.temp.send[n] = new Date().getTime();
					instance.send({echo:true});
				} catch(e) {
					
				}
			},
			onClose: 	function(n, instance) {
				try {
					scope.stats._close++;
					scope.stats.speed.close[n] = new Date().getTime()-scope.stats.temp.init[n];
				} catch(e) {
					
				}
			},
			onFail: 	function(n, instance) {
				try {
					scope.stats._fail++;
					scope.stats.speed.fail[n] = new Date().getTime()-scope.stats.temp.init[n];
				} catch(e) {
					
				}
			},
			onReceive: 	function(n, instance, message) {
				try {
					if (!message.ping) {
						scope.stats._receive++;
						scope.stats.speed.receive[n] = new Date().getTime()-scope.stats.temp.send[n];
					}
					//instance.close();
				} catch(e) {
					
				}
			}
		},
		Cylon:	{
			onStart:	function() {
				scope.stats = {
					_open:		0,
					_fail:		0,
					_close:		0,
					_receive:	0,
					temp:		{
						init:		{},
						send:		{},
					},
					speed:		{
						open:		{},
						close:		{},
						fail:		{},
						receive:	{}
					}
					
				};
			},
			onInit:		function(n) {
				try {
					scope.stats.temp.init[n] = new Date().getTime();
				} catch(e) {
					
				}
			},
			onConnect: 	function(n, instance) {
				try {
					scope.stats._open++;
					scope.stats.speed.open[n] = new Date().getTime()-scope.stats.temp.init[n];
					scope.stats.temp.send[n] = new Date().getTime();
					instance.send({
						raceToken: '0c8b800b-2fad-4195-a3b6-d2b30d827dce',
						send_time:	new Date().getTime()
					});
				} catch(e) {
					
				}
			},
			onClose: 	function(n, instance) {
				try {
					scope.stats._close++;
					scope.stats.speed.close[n] = new Date().getTime()-scope.stats.temp.init[n];
					delete scope.clients[n];
				} catch(e) {
					
				}
			},
			onFail: 	function(n, instance) {
				try {
					scope.stats._fail++;
					scope.stats.speed.fail[n] = new Date().getTime()-scope.stats.temp.init[n];
					delete scope.clients[n];
				} catch(e) {
					
				}
			},
			onReceive: 	function(n, instance, message) {
				try {
					if (message.send_time) {
						scope.stats._receive++;
						scope.stats.speed.receive[n] = new Date().getTime()-message.send_time;
					}
				} catch(e) {
					
				}
			}
		},
		Operator:	{
			onStart:	function() {
				scope.stats = {
					_open:		0,
					_fail:		0,
					_close:		0,
					_receive:	0,
					temp:		{
						init:		{},
						send:		{},
					},
					speed:		{
						open:		{},
						close:		{},
						fail:		{},
						receive:	{}
					}
					
				};
			},
			onInit:		function(n) {
				try {
					scope.stats.temp.init[n] = new Date().getTime();
				} catch(e) {
					
				}
			},
			onConnect: 	function(n, instance) {
				try {
					scope.stats._open++;
					scope.stats.speed.open[n] = new Date().getTime()-scope.stats.temp.init[n];
					scope.stats.temp.send[n] = new Date().getTime();
					instance.send({
						authToken: '980a21dfd43488f30ca4d27b8f686783',
						rid:3,
						send_time:	new Date().getTime()
					});
				} catch(e) {
					
				}
			},
			onClose: 	function(n, instance) {
				try {
					scope.stats._close++;
					scope.stats.speed.close[n] = new Date().getTime()-scope.stats.temp.init[n];
					delete scope.clients[n];
				} catch(e) {
					
				}
			},
			onFail: 	function(n, instance) {
				try {
					scope.stats._fail++;
					scope.stats.speed.fail[n] = new Date().getTime()-scope.stats.temp.init[n];
					delete scope.clients[n];
				} catch(e) {
					
				}
			},
			onReceive: 	function(n, instance, message) {
				try {
					if (message.send_time) {
						scope.stats._receive++;
						scope.stats.speed.receive[n] = new Date().getTime()-message.send_time;
						//instance.close();
					}
				} catch(e) {
					
				}
			}
		}
	}
};

exports.scenarios = scenarios;