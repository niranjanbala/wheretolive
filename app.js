// Include the cluster module
var cluster = require('cluster');
// Code to run if we're in the master process
if (cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;
    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
    	cluster.fork();
    }
    // Listen for dying workers
    cluster.on('exit', function (worker) {
      // Replace the dead worker, we're not sentimental
      console.log('Worker ' + worker.id + ' died :(');
      	cluster.fork();
      });
// Code to run if we're in a worker process
} else {
    // Include Express
    var express = require('express');
    var compression = require('compression')
    var bodyParser = require('body-parser');
    // Create a new Express application
    var app = express();
    var path = require('path');
    var util=require('util');

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(compression({filter: shouldCompress}))
    app.set('port', process.env.PORT || 3000);
    function shouldCompress(req, res) {
    	if (req.headers['x-no-compression']) {
    		// don't compress responses with this request header
    		return false
    	}
		  // fallback to standard filter function
		  return compression.filter(req, res)
		}
		app.route('/smart-search').get(function(req, res, next) {
			var json=JSON.parse(req.query.qs);
			var options={
				search_intent: json.search_intent,
				cityName:json.cityName,
				minRent:json.min_inr, 
				maxRent:json.max_inr, 
				houseTypes:json.houseTypes, 
				bedRooms:json.bedRooms, 
				lat1:json.lat1, 
				lng1:json.lng1, 
				lat2:json.lat2, 
				lng2:json.lng2
			};
			var api=require('./solrApi');
			api.getJsonData(options, function(err, response){
				if(err){
					res.redirect("https://www.commonfloor.com");
				}else {					
			    var defaultSearchIntent="search_intent="+options.search_intent;
			    var defaultRentParams="&min_inr="+options.minRent+"&max_inr="+options.maxRent;
			    var defaultBedParams="&bed_rooms="+options.bedRooms;
			    var defaultHouseType="&house_type="+options.houseTypes;			    
			    var url="https://www.commonfloor.com/listing-search?"+defaultSearchIntent+"&page=1&city="+options.cityName+
			    "&use_pp=0&set_pp=0&fetch_max=1&number_of_children=2&page_size=30&physically_verified=1&polygon=1&mapBounds=";
			    url+=options.lat1+","+options.lng1+","+options.lat2+","+options.lng2;
			    url+=defaultRentParams;
			    url+=defaultBedParams;
			    url+=defaultHouseType;
			    var data=JSON.parse(response);
			    var obj={};
			    data.data.forEach(function(item){
            if(item.children && item.children.length>0){                        
                var name= item.children[0].listing_area;
                var isRoad=name.toLowerCase().indexOf('road');
                var id= item.children[0].listing_area_id;
                if(isRoad==-1){
                    if(!obj["area_"+id]) {
                        obj["area_"+id]={
                            id: "area_"+id,
                            name:name, 
                            count:1
                        };
                    }
                    else{
                        obj["area_"+id].count=obj["area_"+id].count+1;
                    }
                }
            }                    
        })                
        var dataArray = Object.keys(obj).map(function(k){return obj[k]});
        dataArray.sort(function compare(a,b) {
            if(a.count==b.count)
                return 0;
            else if(a.count>b.count){
                return -1;
            } else {
                return 1;
            }
				});
        var CF_RESULT=dataArray.splice(0,5);    
			  if(CF_RESULT){                
			        var nameArray = Object.keys(CF_RESULT).map(function(k){return CF_RESULT[k].name});
			        var idArray = Object.keys(CF_RESULT).map(function(k){return CF_RESULT[k].id});
			        url+="&prop_name="+nameArray.join(",");
			        url+="&property_location_filter="+idArray.join(",");
			    }
					res.redirect(url);
				}				
			});
		});
		app.route('/location').post(function(req, res, next) {
			var api=require('./solrApi');
			var json=req.body;
			var timeStamp=new Date().getTime();
			var md5 = require('md5');
			var request_id=md5(timeStamp)
			var options={
				search_intent: json.search_intent,
				cityName:json.cityName,
				minRent:json.min_inr, 
				maxRent:json.max_inr, 
				houseTypes:json.houseTypes, 
				bedRooms:json.bedRooms, 
				lat1:json.lat1, 
				lng1:json.lng1, 
				lat2:json.lat2, 
				lng2:json.lng2,
				time_stamp: timeStamp,
				request_id:request_id
			};

			api.getJsonData(options, function(err, response){
				if(err){
					res.json(null);
				}else {
					var response=JSON.parse(response);
					response.request_id=request_id;
					res.json();	
				}				
			})
		});
		app.route('/process').post(function(req, res, next) {
			var turf=require('turf');
			var json=req.body.params;
			var unit='kilometers';
			var intersect=null;
			var somethingWentWrong=false;
			var features=[];
			for(var index in json) {
				var location=json[index].location;
				var point=turf.point([Number(location.lng), Number(location.lat)]);
				features.push(point);
				var buffered = turf.buffer( point, Number(json[index].distance), unit);				
				var polygon = turf.polygon(buffered.features[0].geometry.coordinates, {
					"fill": "#6BC65F",
    			"stroke": "#6BC65F",
    			"stroke-width": 5
				});
				if(!intersect){
					intersect=polygon;
				}
				else {
					var intersection=turf.intersect(intersect, polygon)
					if(intersection){
						intersect = intersection;
					} else {
						console.log('somethingWentWrong1');
						somethingWentWrong=true;
					}
				}
				if(!intersect) {
					console.log('somethingWentWrong2');
					somethingWentWrong=true;
				}
			}
			if(!somethingWentWrong){
				var square = turf.bboxPolygon(turf.square(turf.extent(intersect)));
				res.json(square);
			} else {
				var points = turf.featurecollection(features);
				if(points.length>2){
					var hull = turf.convex(points);
					res.json(hull);					
				} else {
					res.json(null);
				}
			}
		});
		app.route('/singapore/listings').get(function(req, res, next) {
			var json=JSON.parse(req.query.qs);
			var SG_RENT=[{"min":500,"max":2000},{"min":2000,"max":5000},{"min":5000,"max":10000},{"min":10000,"max":20000},{"min":20000,"max":50000}];
			var SG_BEDS=[{"min":1,"max":2},{"min":3,"max":3},{"min":4,"max":4},{"min":5,"max":5},{"min":6,"max":10}];
			var SG_PT=[
			"&property_type=L&property_type_code%5B%5D=TERRA&property_type_code%5B%5D=DETAC&property_type_code%5B%5D=SEMI&property_type_code%5B%5D=CORN&property_type_code%5B%5D=LBUNG&property_type_code%5B%5D=BUNG&property_type_code%5B%5D=SHOPH&property_type_code%5B%5D=RLAND&property_type_code%5B%5D=TOWN&property_type_code%5B%5D=CON&property_type_code%5B%5D=LCLUS",
			"&property_type=N&property_type_code%5B%5D=CONDO&property_type_code%5B%5D=APT&property_type_code%5B%5D=WALK&property_type_code%5B%5D=CLUS&property_type_code%5B%5D=EXCON",
			"&property_type=H&property_type_code%5B%5D=HDB"
			];
			function createLinkSg (propertyTypeIndex,rentIndex,bedIndex, radius, centerLat,centerLon ) {
			    var linkFormat="/ps_xmlhttp_fullmapsearch?listing_type=rent%s&minprice=%d&maxprice=%d&minbed=%d&maxbed=%d&distance=%d&center_lat=%d&center_long=%d&latitude=%d&longitude=%d";
			    return util.format(linkFormat, SG_PT[json.propertyTypeIndex], SG_RENT[json.rentIndex].min, SG_RENT[json.rentIndex].max, SG_BEDS[json.bedIndex].min, SG_BEDS[json.bedIndex].max, json.radius, json.centerLat, json.centerLon, json.centerLat, json.centerLon);
			}
			var link=createLinkSg(json);
			var api=require('./solrApi');
			var options = {
        host: 'www.propertyguru.com.sg',
        path: link
  		};
			api.getJsonDataFromUrl(options, function(err, response){
				if(err){
					res.json(null);
				}else {
					console.log(options)
					//var responseObj=JSON.parse(response);
					res.json({
						r: response
					});	
				}				
			})
		});
		app.listen(app.get('port'));
		console.log('Worker ' + cluster.worker.id + ' running!');
	}