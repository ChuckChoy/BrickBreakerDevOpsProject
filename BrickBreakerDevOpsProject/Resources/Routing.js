//routing model
var expressed = require('express');
var router = expressed.Router();
var sql = require('mssql');
var path = require('path');
var fs = require('fs');

//Server = tcp:brickbreak.database.windows.net, 1433; Initial Catalog= BrickBreakSQL; Persist Security Info= False; User ID= { your_username }; Password = { your_password }; MultipleActiveResultSets = False; Encrypt = True; TrustServerCertificate = False; Connection Timeout= 30;
//basically the connection string
var config = {
    server: 'brickbreak.database.windows.net',
    database: 'BrickBreakSQL',
    user: 'brickbreakadmin',
    password: 'Fish125!',   
    port:1433,
    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
};

//intial routing to index page
router.get('/', function (request, response) {
    //sends back a file using file path
    response.sendFile(path.join(__dirname + '/Index.html'));
});
//routing to game.js file
router.get('/Game.js', function (request, response) {
    response.sendFile(path.join(__dirname + '/Game.js'));
});
//routing to waiting image
router.get('/Waiting.jpg', function (request, response) {
    //creates a stream  for the image
    var stream = fs.createReadStream(path.join(__dirname + '/Waiting.jpg'));
    //sends stream
    stream.on('open', function () {
        response.set('Content-Type', 'image/jpeg');
        stream.pipe(response);
    });
});
//routing to gameover image
router.get('/GameOver.png', function (request, response) {
    var stream = fs.createReadStream(path.join(__dirname + '/GameOver.png'));
    stream.on('open', function () {
        response.set('Content-Type', 'image/png');
        stream.pipe(response);
    });
});
//Login routing
router.post('/login', function (request, response) {
    //get values from POST body
    var username = request.body.username;
    var password = request.body.password;
    //create a return variable
    var Result = 0;
    var checkLogin = function () {
        //prepare a connection with the 'config' values
        var conn = new sql.ConnectionPool(config);
        //create the connection to the database then..
        conn.connect().then(function (conn) {
            //create a request variable for the connection
            var request = new sql.Request(conn);
            //create parameters
            request.input('username', sql.VarChar(20), username);
            request.input('password', sql.VarChar(10), password);
            request.output('Result', sql.Int);
            //execute the request
            request.execute('checkLogin4').then(function (err, recordsets, returnValue, affected) {
                //still doesn't work right
                console.log("Player ID : " + err.output.Result);
                Result = err.output.Result;
            }).catch(function (err) {
                console.log(err);
            });
        });
    };
    checkLogin();
    if (Result >= 1)
        response.send("Success");
    else
        response.send("Fail");

});
////registration routing
router.post('/register', function (request, response) {
     //fvariables that are passed in with the request
    var username = request.body.username;
    var email = request.body.email;
    var password = request.body.password;
    //opens sql connection
    sql.connect(config, function (err) {
        if (err)
            console.log(err);
        //create new request
        var request = new sql.Request();
        //make the query
        request.query("Insert INTO UserLogin Values('" + username + "','" + email+ "','" + password + "')", function (err) {
            if (err)
                console.log(err);
            response.send("success");
        });
    });
    //console.log(request.body.username);
});
router.post('/recordGame', function (request, response) {

});

module.exports = router;