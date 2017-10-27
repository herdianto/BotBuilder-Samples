var Promise = require('bluebird');
var query = require('./helper/db_connection');

var images = [
    "https://i.stack.imgur.com/MHmQW.png",
    "https://i.stack.imgur.com/5wSvf.png",
    "https://i.stack.imgur.com/1KYTw.png"
];

module.exports = {
    getShortestPath: function (from, to, test) {
            const Graph = require('node-dijkstra');
            const route = new Graph();
            //route.addNode('A', {"B":10,"C":5});
            //route.addNode('B', {"A":10,"E":2});
            //route.addNode('C', {"B":7,"D":3});
            //route.addNode('E', {"D":7});
            let query_cmd = "select start_point, routes from routes_result";
            query(query_cmd).then(function(data){
                var routes = [];
                var string_from = "";
                var string_to = "";
                string_from = from.toUpperCase();
                string_to = to.toUpperCase();

                for(let i=0; i<data.length; i++){
                    var map = {};
                    var str = data[i].routes;
                    map =  JSON.parse(str);
                    if(map){
                        route.addNode(data[i].start_point, map);
                    }
                    //console.log("start: "+data[i].start_point);
                    //console.log("map: "+JSON.stringify(map));
                }

                var path = route.path(string_from, string_to,{ cost: true });
                //var path = graph.path('C', 'B',{ cost: true });
                console.log(JSON.stringify(path));
                    routes.push({
                        title : 'Fastest Routes: ',
                        lane : path.path,
                        cost : path.cost,
                        image: images[Math.floor(Math.random() * images.length)]
                    });
                
                test(routes); // => [ 'A', 'B', 'C', 'D' ]
            });
            
      
    },
    getAllhPaths: function (from, to, results) {
        
            const Graph = require('node-all-paths')
            const graph = new Graph()
            
            let query_cmd = "select start_point, routes from routes_result";
            //let query_cmd = "select * from routes";
            query(query_cmd).then(function(data){
                graph.addNode('A', {"B":10,"C":5});
                graph.addNode('B', {"A":10,"E":2});
                graph.addNode('C', {"B":7,"D":3});
                graph.addNode('E', {"D":7});
               
                //var str = '{"C":2, "D":4}';
                //var map = {};
                //map =  JSON.parse(str);
                //map["C"] = 2;
                //map["D"] = 4;

                //console.log("length:"+data.length);
                for(let i=0; i<data.length; i++){
                    var map = {};
                    var str = data[i].routes;
                    map =  JSON.parse(str);
                    if(map){
                        //graph.addNode(data[i].start_point, map);
                    }
                    console.log("start: "+data[i].start_point);
                    console.log("map: "+JSON.stringify(map));
                }

                var routes = [];
                var string_from = "";
                var string_to = "";
                string_from = from.toUpperCase();
                string_to = to.toUpperCase();
                var path = graph.path(string_from, string_to,{ cost: true });
                //var path = graph.path('C', 'B',{ cost: true });
                console.log(JSON.stringify(path));
                for(let i=0; i<path.length; i++){
                    routes.push({
                        title : 'Route - '+(i+1),
                        lane : path[i].path,
                        cost : path[i].cost,
                        image: images[Math.floor(Math.random() * images.length)]
                    });
                }
                results(routes); // => [ 'A', 'B', 'C', 'D' ]
            }).catch(function(e){
                console.log("error: "+e);
                results(null);
            });;
      
    }
};