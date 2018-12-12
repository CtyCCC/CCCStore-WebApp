var AWS = require("aws-sdk");

AWS.config.loadFromPath('configDynamoDB.json');

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "Product",
    KeySchema: [
        { AttributeName: "idSP", KeyType: "HASH"},  //Partition key
        { AttributeName: "nameSP", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "idSP", AttributeType: "S" },
        { AttributeName: "nameSP", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});