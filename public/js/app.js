var locations=[];
var CF_RESULT;
var polygon;
var circle;
var selectedCityIndex=-1;   
//var host="http://lookingforhouse.in";
var host="";
var infoWindow = new google.maps.InfoWindow({
    content: "<a>Click to see matching properties.</a>"
});     
function cta () {
}
function compare(a,b) {
            if(a.count==b.count)
                return 0;
            else if(a.count>b.count){
                return -1;
            } else {
                return 1;
            }
}
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
function findCity(place){            
    return place.formatted_address.indexOf(city);
}
function setAutoCompleteListener(autocomplete, index){
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
        var place = autocomplete.getPlace();                
        if (!place.geometry) {
            locations[index]=null;
            sweetAlert("Oops...", "Invalid location selected", "error");
            return;
        }
        var cityIndex=findCity(place);
        if(cityIndex>=0) {            
            locations[index]=place.geometry.location;               
        }
    });
}
var SG_RENT=[{"min":500,"max":2000},{"min":2000,"max":5000},{"min":5000,"max":10000},{"min":10000,"max":20000},{"min":20000,"max":50000}];
var SG_BEDS=[{"min":1,"max":2},{"min":3,"max":3},{"min":4,"max":4},{"min":5,"max":5},{"min":6,"max":10}];
var SG_PT=[
"&property_type=L&property_type_code%5B%5D=TERRA&property_type_code%5B%5D=DETAC&property_type_code%5B%5D=SEMI&property_type_code%5B%5D=CORN&property_type_code%5B%5D=LBUNG&property_type_code%5B%5D=BUNG&property_type_code%5B%5D=SHOPH&property_type_code%5B%5D=RLAND&property_type_code%5B%5D=TOWN&property_type_code%5B%5D=CON&property_type_code%5B%5D=LCLUS",
"&property_type=N&property_type_code%5B%5D=CONDO&property_type_code%5B%5D=APT&property_type_code%5B%5D=WALK&property_type_code%5B%5D=CLUS&property_type_code%5B%5D=EXCON",
"&property_type=H&property_type_code%5B%5D=HDB"
];
function createLinkSg (propertyTypeIndex,rentIndex,bedIndex, radius, centerLat,centerLon ) {
    var linkFormat="http://www.propertyguru.com.sg/singapore-property-listing?listing_type=rent{0}&minprice={1}&maxprice={2}&minbed={3}&maxbed={4}&distance={5}&center_lat={6}&center_long={7}&latitude={8}&longitude={9}";
    return linkFormat.format(SG_PT[propertyTypeIndex], SG_RENT[rentIndex].min, SG_RENT[rentIndex].max, SG_BEDS[bedIndex].min, SG_BEDS[bedIndex].max, radius, centerLat, centerLon, centerLat, centerLon);    
}
function createJsonLinkSg (propertyTypeIndex,rentIndex,bedIndex, radius, centerLat,centerLon ) {
    var linkFormat="http://www.propertyguru.com.sg/ps_xmlhttp_fullmapsearch?listing_type=rent{0}&minprice={1}&maxprice={2}&minbed={3}&maxbed={4}&distance={5}&center_lat={6}&center_long={7}&latitude={8}&longitude={9}";
    return linkFormat.format(SG_PT[propertyTypeIndex], SG_RENT[rentIndex].min, SG_RENT[rentIndex].max, SG_BEDS[bedIndex].min, SG_BEDS[bedIndex].max, radius, centerLat, centerLon, centerLat, centerLon);
}
function clearMarkersFromMap(markers) {
    markers.forEach(function(marker) {
        marker.setMap(null);
    });
    markers = [];
}
var markers=[];
function createLink (map, propertyTypeIndex,rentIndex,bedIndex, radius, centerLat,centerLon) {
    if(city=='Singapore') {        
        var link=createLinkSg(propertyTypeIndex,rentIndex,bedIndex, radius, centerLat, centerLon);
        $('.democlass a').attr('href', link);
        $('.democlass a').attr('target','_blank');
        var jsonLink=createJsonLinkSg(propertyTypeIndex,rentIndex,bedIndex, radius, centerLat, centerLon);
        clearMarkersFromMap(markers);
        $.getJSON(jsonLink+"&callback=?", function( data ) {
            for(var i=1;i<data.length;i++) {
                var location=new google.maps.LatLng(data[i].listing.split('^')[9], data[i].listing.split('^')[10]);
                var centerPoint=new google.maps.LatLng(centerLat, centerLon);
                var distance = google.maps.geometry.spherical.computeDistanceBetween(centerPoint, location);                
                if(distance < Math.ceil(radius*1000)-300) {
                    var marker = new google.maps.Marker({
                        map: map,
                        position: location,
                        icon: new google.maps.MarkerImage(data[i].listing.split('^')[19],null, null, null, new google.maps.Size(30, 30))
                    });
                    markers.push(marker);
                }
            }
        });
    }
}
var map;
function saveUserFilters (locations) {
    Parse.initialize("6ZVMxs4v7FWwTBJ7RdSWIws8T0F2mfPVZ1gELmxZ", "YcWTu3cqBLiG1Cc8V2UymEhGphtATQZ5nZ2KPFj8");
    var UserFilter = Parse.Object.extend("UserFilter");
    var userFilter = new UserFilter();
    userFilter.set("age",$(".age").val());
    userFilter.set("gender",$(".gender").val());
    userFilter.set("relationship",$(".relationship-status").val());
    userFilter.set("livingWith",$(".living-with").val());
    userFilter.set("intent",$(".search-intent").val());
    userFilter.set("bhk",$(".search-bhk").val());
    userFilter.set("city",$('#city').val());
    userFilter.set("locations",locations);    
    userFilter.save(null, {
      success: function(userFilter) {    
      },
      error: function(userFilter, error) {
      }
    });
}
function initialize() {
    var mapOptions = {
        center: new google.maps.LatLng(DEFAULT_LAT,DEFAULT_LNG),
        scrollwheel: false,
        scrollwheel: false,
        panControl: false,
        streetViewControl: false,
        zoom: 10,
        minZoom:10,
        maxZoom:18
    };
    map = new google.maps.Map($('#map')[0], mapOptions);
    $('.controls.pac-input').each(function(index){
        locations.push(null);
        var autoOptions = {
            types: ["geocode"]
        };

        var autocomplete = new google.maps.places.Autocomplete($(this)[0],MAP_OPTIONS);
        setAutoCompleteListener(autocomplete, index);
    });
    $('.nl-submit').click(function() {
        var params=$('select.nlform-select.distance').map(function() {
         return { distance: $(this).val()};
        }).get();
        locations.forEach(function(item, index){
            if(item) {                        
                params[index].location={lat:item.lat(), lng:item.lng()};
                params[index].cityIndex=city
            }
        });    
        var skipNullLocations=function(obj){
            return obj.location!=null;
        }
        var filtered=params.filter(skipNullLocations);
        if(filtered.length==0) {
            sweetAlert("Oops...", "Please select at-least one location", "error");
            //alert("Please select at-least one location");
            return;
        }
        selectedCityIndex=filtered[0].cityIndex;
        $.post( host+"/process", { params: filtered})
          .done(function( data ) {
            //saveUserFilters(filtered);
            if(data){
                $("html, body").animate({ scrollTop: $(document).height() }, 1000);
                var features=map.data.addGeoJson(data);                        
                map.data.forEach(function(feature) {
                    processPoints(map, feature.getGeometry());
                });
                features.forEach(function(feature){
                    map.data.remove(feature);
                });
                var bounds=polygon.getBounds();
                var center=bounds.getCenter();
                var radiusInMeter=getRadius(bounds);    
                createLink(map, $(".search-apt-type").val(),$(".search-budget").val(),$(".search-bhk").val(),Math.ceil(radiusInMeter/1000),center.lat(), center.lng());
            } else {
                swal("Sorry! you are a hard person to satisfy :)");
                if(polygon) {
                    infoWindow.setMap(null);
                    polygon.setMap(null);
                }
            }
        });
        return false;
    });    
}
//DONOTTOUCH : MAP RELATED
var polygon;
if (!google.maps.Polygon.prototype.getBounds) {
  google.maps.Polygon.prototype.getBounds=function(){
      var bounds = new google.maps.LatLngBounds();      
      this.getPath().forEach(function(element,index){bounds.extend(element)})
      return bounds;
  }
}
function processPoints(map, geometry) {
  var paths=[];
  geometry.getArray()[0].getArray().forEach(function(g) {
    paths.push(new google.maps.LatLng(g.lat(), g.lng()));
  });
  if(!polygon) {
      polygon=new google.maps.Polygon({
        strokeColor: '#2191B1',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#2191B1',
        fillOpacity: 0.3
      }); 
      circle=new google.maps.Polygon({
        map: map,
        strokeColor: '#2191B1',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#2191B1',
        fillOpacity: 0.3
      });
  }          
  polygon.setPath(paths);
  var bounds=polygon.getBounds();
  var center=bounds.getCenter();
  var radiusInMeter=getRadius(bounds);
  var pathCircle=drawCircle(center, kmToMiles(radiusInMeter / 1000), 1);
  circle.setPaths(pathCircle);
  circle.setMap(map);
  map.fitBounds(bounds);
}
function getRadius(bounds){
    var center = bounds.getCenter();
    var ne = bounds.getNorthEast();

    // r = radius of the earth in statute miles
    var r = 3963.0;  

    // Convert lat or lng from decimal degrees into radians (divide by 57.2958)
    var lat1 = center.lat() / 57.2958; 
    var lon1 = center.lng() / 57.2958;
    var lat2 = ne.lat() / 57.2958;
    var lon2 = ne.lng() / 57.2958;

    // distance = circle radius from center to Northeast corner of bounds
    var dis = r * Math.acos(Math.sin(lat1) * Math.sin(lat2) + 
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1));
    return dis*1000;
}
function kmToMiles(kilometres) {
        var miles = Number(kilometres) * .62;
        return miles.toFixed(2);
}
function drawCircle(point, radius, dir) {
        var d2r = Math.PI / 180; // degrees to radians 
        var r2d = 180 / Math.PI; // radians to degrees 
        var earthsradius = 3963; // 3963 is the radius of the earth in miles

        var points = 32;

        // find the raidus in lat/lon 
        var rlat = (radius / earthsradius) * r2d;
        var rlng = rlat / Math.cos(point.lat() * d2r);

        var extp = new Array();
        if (dir == 1) {
            var start = 0;
            var end = points + 1; // one extra here makes sure we connect the path
        } else {
            var start = points + 1;
            var end = 0;
        }
        for (var i = start;
            (dir == 1 ? i < end : i > end); i = i + dir) {
            var theta = Math.PI * (i / (points / 2));
            var ey = point.lng() + (rlng * Math.cos(theta)); // center a + radius x * cos(theta) 
            var ex =  point.lat() + (rlat * Math.sin(theta)); // center b + radius y * sin(theta) 
            extp.push(new google.maps.LatLng(ex, ey));
        }
        return extp;
}
google.maps.event.addDomListener(window, 'load', initialize);