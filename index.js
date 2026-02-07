const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
require('dotenv').config();
const asyncRedis = require("async-redis");
const compression = require('compression');
global.__basedir = __dirname;
global.redisClient = asyncRedis.createClient(process.env.REDIS_PORT, process.env.REDIS_URL);
redisClient.on("error", function (err) {
    console.log("Error " + err);
});

const options = {
   
};

mongoose.connect(process.env.DB_CONNECTION_AUTH_ROOM,
    options
).then(function () {
    console.log("=========================================");
    console.log('DataBase Connection Response (Authroom Api DB) : OK');
    console.log("=========================================");
}).catch(function (err) {
    console.log(err);
    console.log("=========================================");
    console.log('DataBase Connection Response (Authroom Api DB) : ERROR');
    console.log("=========================================");
});


app.get("/", function (req, res) {
    return res.status(200).json({
        meta: {
            message: "authroom Api App.",
            status_code: 200,
            status: true
        }
    });
});



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
require('./routes/api')(app);
app.use(compression());

app.listen(process.env.NODE_SERVER_PORT, function () {
    
    console.log("=======================================================");
    console.log("Running Application Port ( Authroom ) : " + process.env.NODE_SERVER_PORT);
    console.log("=======================================================");
});
