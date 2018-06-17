//routing model


var expressed = require('express');
var router = expressed.Router();
var sql = require('mssql');
var path = require('path');
var fs = require('fs');

var config = {
    user: 'BrickBreakerUser',
    password: 'Agile',
    server: 'localhost',
    database: 'BrickBreaker'
};

router.get('/', function (request, response) {
    response.sendFile(path.join(__dirname + '/Index.html'));
    //response.render("index.html");
    //response.send("hello world");//this works...
});
router.get('/Game.js', function (request, response) {
    response.sendFile(path.join(__dirname + '/Game.js'));
});
router.get('/Waiting.jpg', function (request, response) {
    var stream = fs.createReadStream(path.join(__dirname + '/Waiting.jpg'));
    stream.on('open', function () {
        response.set('Content-Type', 'image/jpeg');
        stream.pipe(response);
    });
});
router.get('/GameOver.png', function (request, response) {
    var stream = fs.createReadStream(path.join(__dirname + '/GameOver.png'));
    stream.on('open', function () {
        response.set('Content-Type', 'image/png');
        stream.pipe(response);
    });
});
//API?
router.post('/login', function (request, response) {
    sql.connect(config, function (err) {
        if (err)
            console.log(err);
        new sql.Request()
            .input() // inputs needed for stored procedure
            .execute('', function (err, recordset, returnValue) { //name for stored procedure
                if (err)
                    console.log(err);
                console.log(returnValue); //no return because it's just logging a score
            });
    });
});
router.post('/register', function (request, response) {
    // variables that are passed in with the request
    //sample variable
    var username = request.body.username;
    var password = request.body.password;
    sql.connect(config, function (err) {
        if (err)
            console.log(err);
        var request = new sql.Request();
        request.query("Insert INTO BrickBreaker.GameUsers Values(username = ?, password = ?", [username, password], function (err) {
            if (err)
                console.log(err);
            response.send("success");
        });
    });
});
router.post('/recordGame', function (request, response) {

});

module.exports = router;