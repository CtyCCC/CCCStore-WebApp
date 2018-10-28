var AWS = require("aws-sdk");

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});
AWS.config.accessKeyId="sadsadd";
AWS.config.secretAccessKey="gfgfgfgfgfgf";
var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "Product"
};

dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted success!");
    }
});