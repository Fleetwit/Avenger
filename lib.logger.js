var http 				= require('http');
var uuid 				= require('./lib.uuid');
var _ 					= require('underscore');
var qs 					= require('querystring');
var fs 					= require('fs');

function logger(options) {
	var scope = this;
	this.color = {
		'reset': 		'\033[0m',
		'bold': 		'\033[1m',
		'italic': 		'\033[3m',
		'underline': 	'\033[4m',
		'blink': 		'\033[5m',
		'black': 		'\033[30m',
		'red': 			'\033[31m',
		'green': 		'\033[32m',
		'yellow': 		'\033[33m',
		'blue': 		'\033[34m',
		'magenta': 		'\033[35m',
		'cyan': 		'\033[36m',
		'white': 		'\033[37m'
	};
	
	this.options = _.extend({
		label:		"LOGGER",
		color:		"red"
	},options);
}
logger.prototype.log = function(){
	var args = [this.color[this.options.color]+this.options.label+"\n"];
	for (i in arguments) {
		args.push(this.color['white']+arguments[i]+this.color['reset']+"\n");
	}
	console.log.apply(this, args);
};
logger.prototype.info = function(){
	var args = [this.color[this.options.color]+this.options.label+"\n"];
	for (i in arguments) {
		args.push(this.color['green']+arguments[i]+this.color['reset']+"\n");
	}
	console.log.apply(this, args);
};
logger.prototype.error = function(){
	var args = [this.color[this.options.color]+this.options.label+"\n"];
	for (i in arguments) {
		args.push(this.color['red']+this.color['blink']+arguments[i]+this.color['reset']+"\n");
	}
	console.log.apply(this, args);
};

exports.logger = logger;