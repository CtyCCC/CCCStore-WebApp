var AWS = require("aws-sdk");
var fs = require('fs');

AWS.config.loadFromPath('configDynamoDB.json');

var docClient = new AWS.DynamoDB.DocumentClient();

console.log("Importing movies into DynamoDB. Please wait.");

var allMovies = JSON.parse(fs.readFileSync('dataKH.json', 'utf8'));
allMovies.forEach(function(cus) {
    var params = {
        TableName: "Customers",
        Item: {
            "userName" : cus.userName,
            "password" : cus.password,
            "sdtKH": cus.sdtKH,
            "tenKH" : cus.tenKH,
            "Email" : cus.Email,
            "diaChi" : cus.diaChi,
            "dsSP" : cus.dsSP
        }
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add movie", cus.tenKH, ". Error JSON:",JSON.stringify(err,null,2));
        } else {
            console.log("PutItem succeeded:", cus.tenKH);
        }
    });
});
