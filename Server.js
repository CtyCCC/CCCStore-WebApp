var express = require('express');
var app = express();
var cheerio = require('cheerio');
var fs = require('fs');
var AWS = require('aws-sdk');

/////Khai báo config cho aws sử dụng dynamodb
AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});
AWS.config.accessKeyId="sadsadd";
AWS.config.secretAccessKey="gfgfgfgfgfgf";
var docClient = new AWS.DynamoDB.DocumentClient();

app.use('/public', express.static('public'));


////Get trang chủ///////
app.get("/",function (req,res) {
    res.sendFile(__dirname+"/index.html");

});

////Get trang product//////
app.get("/product",function (req,res) {
    var params={TableName:"Product"};
    var index_sp = 1;
    docClient.scan(params, onScan);
    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Scan succeeded.");
            fs.readFile(__dirname+"/product.html",'utf8',function (err,data1) {
                var $ = cheerio.load(data1);
                data.Items.forEach(function(product){
                    console.log("id:"+ product.idSP + "  +tenSP:", product.nameSP);
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
                    //console.log($(imgsp + index_sp).attr('src'));
                    $(namesp + index_sp + "").text(product.nameSP);
                    $(giasp + index_sp + "").text(product.info.price+"VNĐ");
                    $(imgsp + index_sp).attr('src', product.info.images[0]);
                    index_sp = index_sp + 1;
                });
                res.writeHead(200,{'Context-Type':'text/html'});
                res.write($.html());
                res.end();
            });
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }
        }
    }
});

app.listen(8088);
