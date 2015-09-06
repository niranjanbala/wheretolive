var https = require('https');
var solrApi={
	getRequestParam: function(options){
		var requestParam={
		    "search_intent": options.search_intent,
		    "min_inr": options.minRent,
		    "max_inr": options.maxrent,//
		    "house_type": options.houseTypes,
		    "bed_rooms": options.bedRooms,
		    "page": 1,
		    "city": options.cityName,
		    "show_ungrouped_results": 0,//?
		    "physically_verified": 0,//?
		    "bachelors_allowed": "", //?
		    "time_stamp": options.time_stamp,
		    "request_id": options.request_id,
		    "fetch_max": 1,
		    "number_of_children": "2",
		    "mapBounds": [options.lat1, options.lng1, options.lat2, options.lng2],
		    "srtby": "bestquality",
		    "page_size": 30
			};
			return requestParam;
	},
	getJsonDataFromUrl: function  (options, callback) {
		var http = require('http');
		var req = http.request(options, function(res){
			var responseString = '';
			res.setEncoding('utf-8');
			var responseString = '';
			res.on('data', function(data) {
				responseString += data;
			});
			res.on('end', function() {
				callback(null, responseString);
			});
		});
		req.on('error', callback);
		req.end();
	},
	getJsonData: function (options, callback) {
		var dataString = JSON.stringify(this.getRequestParam(options));
		var headers = {
			'Content-Type': 'application/json',
			'Content-Length': dataString.length
		};
		var requestOptions = {
			host: "www.commonfloor.com",
			path: "/nitro/search/search-results",
			method: "POST",
			headers: headers
		};
		var req = https.request(requestOptions, function(res) {
			res.setEncoding('utf-8');
			var responseString = '';
			res.on('data', function(data) {
				responseString += data;
			});
			res.on('end', function() {
				callback(null, responseString);
			});
		});
		req.on('error', callback);
		req.end(dataString);
	}	
}
module.exports=solrApi;
