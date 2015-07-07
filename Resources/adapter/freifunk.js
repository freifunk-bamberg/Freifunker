if (!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}

var url = 'https://map.hamburg.freifunk.net/nodes.json';

function calcRegion(nodes) {
	var lats = 0,
	    lons = 0,
	    minlat = maxlat = parseFloat(nodes[0].lat),
	    minlon = maxlon = parseFloat(nodes[0].lon);
	total = 0;
	nodes.forEach(function(n) {
		var lat = parseFloat(n.lat);
		var lon = parseFloat(n.lon);
		if (lat > 10 && lat < 70 && lon > 2 && lon < 20) {
			lats += lat;
			lons += lon;
			minlat = Math.min(minlat, lat);
			maxlat = Math.max(maxlat, lat);
			minlon = Math.min(minlon, lon);
			maxlon = Math.max(maxlon, lon);
			total++;
		}
	});
	return {
		latitude : lats / total,
		longitude : lons / total,
		latitudeDelta : maxlat - minlat,
		longitudeDelta : maxlon - minlon
	};
}

var Module = function(args) {
	this.eventhandlers = {};
	return this;
};

Module.prototype = {
	loadNodes : function() {
		var args = arguments[0] || {};
		var xhr = Ti.Network.createHTTPClient({
			timeout : 60000,
			onload : function() {
				var barnodes = [];
				/// XML:
				if (this.responseXML) {
					var xml = new (require('vendor/XMLTools'))(this.responseXML);

					var barnodes = xml.toObject().node.map(function(node) {
						return {
							id : node.nodeid,
							lat : node.lat,
							lon : node.lon,
							name : node.name
						};
					});
					args.done && args.done({
						nodes : barnodes,
						region : calcRegion(barnodes)
					});
				/// JSON:
				} else {

					var nodes = JSON.parse(this.responseText).nodes;
					if (Object.prototype.toString.call(nodes) === '[object Array]') {
						if (nodes[0].lat) {
							barnodes = nodes.map(function(loc) {
								return {
									lat : loc.lat,
									lon : loc.lon,
									id : loc.id,
									name : '#' + loc.id
								};
							});
						} else {
							barnodes = nodes.filter(function(n) {
								return (n.geo || n.position) ? true : false;
							});
							barnodes = barnodes.map(function(loc) {

								return {
									lat : loc.geo ? loc.geo[0] : loc.position.lat,
									lon : loc.geo ? loc.geo[1] : loc.position.long,
									id : loc.id,
									name : loc.name
								};
							});
						}
						args.done && args.done({
							nodes : barnodes,
							region : calcRegion(barnodes)
						});
					} else {
						Object.getOwnPropertyNames(nodes).forEach(function(key) {
							var node = nodes[key];
							node.nodeinfo.location && barnodes.push({
								name : node.nodeinfo.hostname,
								lat : node.nodeinfo.location.latitude,
								lon : node.nodeinfo.location.longitude,
								//	lastseen : node.flags.lastseen,
								//	firstseen : node.flags.firstseen,
								//	model : node.nodeinfo.hardware.model,
								id : key,
								//	statistics : node.statistics
							});
						});

						args.done && args.done({
							nodes : barnodes,
							region : calcRegion(barnodes)
						});
					}
				}
			}
		});
		xhr.open('GET', args.url);
		xhr.setRequestHeader('Accept', 'text/javascript, application/javascript');
		xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:37.0) Gecko/20100101 Firefox/37.0');
		xhr.send();
	},
	fireEvent : function(_event, _payload) {
		if (this.eventhandlers[_event]) {
			for (var i = 0; i < this.eventhandlers[_event].length; i++) {
				this.eventhandlers[_event][i].call(this, _payload);
			}
		}
	},
	addEventListener : function(_event, _callback) {
		if (!this.eventhandlers[_event])
			this.eventhandlers[_event] = [];
		this.eventhandlers[_event].push(_callback);
	},
	removeEventListener : function(_event, _callback) {
		if (!this.eventhandlers[_event])
			return;
		var newArray = this.eventhandlers[_event].filter(function(element) {
			return element != _callback;
		});
		this.eventhandlers[_event] = newArray;
	}
};

module.exports = Module;
