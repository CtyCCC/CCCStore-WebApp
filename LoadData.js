var AWS = require("aws-sdk");
var fs = require('fs');

AWS.config.loadFromPath('configDynamoDB.json');

var docClient = new AWS.DynamoDB.DocumentClient();

console.log("Importing movies into DynamoDB. Please wait.");

var allMovies = JSON.parse(fs.readFileSync('data.json', 'utf8'));
allMovies.forEach(function(product) {
    var params = {
        TableName: "Product",
        Item: {
            "idSP":  product.idSP,
            "nameSP": product.nameSP,
            "type": product.type,
            "info":  product.info
        }
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add movie", product.nameSP, ". Error JSON:",JSON.stringify(err,null,2));
        } else {
            console.log("PutItem succeeded:", product.nameSP);
        }
    });
});
