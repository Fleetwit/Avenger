var _ 				= require('underscore');

function stack() {
	this.reset();
}
stack.prototype.reset = function() {
	this.stack 		= [];
}
stack.prototype.add = function(item, params) {
	this.stack.push({
		fn:		item,
		params:	params
	});
}
stack.prototype.process = function(callback) {
	var scope = this;
	
	this.stack[0].fn(this.stack[0].params,function() {
		scope.stack.shift();
		if (scope.stack.length == 0) {
			callback();
		} else {
			scope.process(callback);
		}
	});
}

exports.stack = stack;