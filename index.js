/*jslint node: true */
/*jslint nomen: true */

"use strict";
var express = require('express'),
    mongoose = require('mongoose'),
    app = express();

var server = app.listen(3000, function () {
    var host = server.address().address, port = server.address().port;
});


mongoose.connect('localhost:27017/gis');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    console.log("connected // yay!");
});

var userSchema = mongoose.Schema({userName: String, userPassword: String, polygon: Array},
                                 {collection: 'Users'});
var polygonSchema = mongoose.Schema({coordinates: Array, id: String});

var user = mongoose.model('user', userSchema);
var polygon = mongoose.model('polygon', polygonSchema);


////////////////////////////////////////Talya//////////////////////////////////////////////
app.get('/GetUser', function (req, res) {
    var ret = {};
    var userName = req.query.userName,
        password = req.query.password;
    console.log("got user: " + userName + ". Password: " + password);
    user.findOne({ username: userName, pwd: password }, function (err, userFound) {
        if (err) {
            //return console.error(err);
            ret.IsGood = false;
            ret.ErrorMsg = err;
        }
        else if (userFound == null)
        {
            ret.IsGood = false;
            ret.ErrorMsg = "Not Valid";
        }
        else
        {
            ret.IsGood = true;
            ret.User = userFound;
        }
        res.json(ret);
    });
});

var questionSchema = mongoose.Schema({
    questionId: Number,
    questionTimeAsked: Date,
    questionTypeId: Number,
    userId: Number,
    questionText: String,
    questionLat: Number,
    questionLong: Number
}
    , { collection: 'questions' }
    );

var question = mongoose.model('question', questionSchema);

app.get('/InsertQuestion', function (req, res) {
    var ret = {};
    var questionTypeId = req.query.questionTypeId,
        userId = req.query.userId,
        questionText = req.query.questionText,
        questionLat = req.query.questionLat,
        questionLong = req.query.questionLong,
        questionTimeAsked = new Date();
    //!!!!!!!questionId??
    //!!!!!!!בינתיים לא מכניסה מספר מזהה לשאלה. נראה אם נשתמש במספר שנוצר שם או שניצור לבד

    question.create(
    {
        /*questionId: ?,*/
        questionTimeAsked: questionTimeAsked,
        questionTypeId: questionTypeId,
        userId: userId,
        questionText: questionText,
        questionLat: questionLat,
        questionLong: questionLong
    }
    , function (err, newQuestion) {
        if (err) {
            //return console.error(err);
            ret.IsGood = false;
            ret.ErrorMsg = err;
        }
        else if (newQuestion == null) {
            ret.IsGood = false;
            ret.ErrorMsg = "No Question Inserted";
        }
        else {
            ret.IsGood = true;
            ret.Question = newQuestion;

            //console.log(users);
            //res.json(users);
        }
        console.log(ret);
        res.json(ret);

        //בהמשך ניקח מתוך מה שחוזר את מספר הזיהוי של השאלה בשביל לדגום תשובה לשאלה
    });
});

//////////////////////////////////////////////Eli/////////////////////////////////////////////
// This method is to get the users that can answer a query
app.get('/getusersinpolygon', function (req, res) {
    var poly = req.query.polygon;
    user.find({polygon: {$elemMatch: {$eq: poly}}}, '_id userName', function (err, users) {
        if (err) {
            return console.error(err);
        }
        res.json(users);
    });
});


// This method is to get all the users by the polygon they are within
app.get('/getusersinallpolygon', function (req, res) {
    var long = req.query.long, lat = req.query.lat,
        polyArr = [], toReturn = [],
        p = 0, i = 0, j, found = false;
    // Find the polygons of the given points
    polygon.find({geometry: {$geoIntersects: {$geometry: {type: "Point", coordinates: [long, lat]}}}}, 'id', function (err, poly) {
        console.log("got polygon: " + poly);
        for (i = 0; i < poly.length; i += 1) {
            polyArr.push(poly[i].id);
        }
        polyArr.sort();
        
        // Get all the users and loop to give the right color to each user
        user.find({}, 'userName polygon', function (err, allUsers) {
            var found = false, curUser = null, maxIndex = 0, userText = "";
            for (i = 0; i < allUsers.length; i += 1) {
                found = false;
                curUser = allUsers[i];
                maxIndex = Math.min(polyArr.length, curUser.polygon.length) - 1;
                // Check if the polygon of the user matches the polygon of the given point
                for (p = maxIndex; p >= 0; p -= 1) {
                    if (curUser.polygon[p] === polyArr[p]) {
                        toReturn.push(JSON.parse('{"' + curUser._doc.username + '": ' + p.toString() + '}'));
                        found = true;
                        break;
                    }
                }
                if (found === false) {
                    toReturn.push(JSON.parse('{"' + curUser._doc.username + '": -1}'));
                }
            }
            res.json(toReturn);
        });
    });
});

function smartSearch (lat, long){
        result = []
        regx = re.compile("^0_")
        polygon.findOne({$and: [{id: {$regex: regx}},
                                                {geometry: {$geoIntersects: {$geometry: {type: "Point", coordinates: [lat, lon]}}}}]},
                       function(err, poly){
            result.append(poly['id'])
            });
        while poly and len(poly['children']) > 0:
            polygon.findOne({"$and": [{"id": {"$in": poly['children']}},
                    {"geometry": {"$geoIntersects": {"$geometry": {"type": "Point", "coordinates": [lat, lon]}}}}]})
            try:
                poly = res.next()
                result.append(poly['id'])
            except StopIteration:
                return result
        result.sort()
        return result

}

/////////////////////// from here it is the closeing code////////////////////////////////////////////////

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    mongoose.disconnect();
    console.log("mongo closed");
    if (options.cleanup) {
        console.log('clean');
    }
    if (err) {
        console.log(err.stack);
    }
    if (options.exit) {
        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));
