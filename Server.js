var express = require('express');
var app = express();
var cheerio = require('cheerio');
var fs = require('fs');
var AWS = require('aws-sdk');
var url = require('url');
var storage = require('node-localstorage');

/////Khai báo config cho aws sử dụng dynamodb
AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});
AWS.config.accessKeyId="sadsadd";
AWS.config.secretAccessKey="gfgfgfgfgfgf";
var docClient = new AWS.DynamoDB.DocumentClient();

//lấy image icon bootstrap css trong folder public
app.use('/public', express.static('public'));


////Get trang chủ///////
// app.get("/",function (req,res) {
//     res.sendFile(__dirname+"/product.html");
//
// });

////Get trang product//////
app.get("/",function (req,res) {
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

                //cái này cho 2 cái banner
                var banner1 = '#banner11';
                var banner2 = '#banner22';
                //gán cứng tạm, sau này thêm data cho 2 cái banner,giờ làm biếng tạo s3 quá, có 3 tấm hình
                //tại nếu có để thì phải mua đc, chứ bấm vào lại ko có gì
                $(banner1 + "").attr('href',"product-detail?id=LT005");
                $(banner2 + "").attr('href',"product-detail?id=LK004");
                
                //---Load box chứa item
                for(var i=2;i<data.Items.length;i++)
                {
                    var product = $('#boxstart').clone();
                    product.removeAttr('id');
                    product.find('#img_sp_1').attr('id','img_sp_'+i);
                    product.find('#name_sp_1').attr('id','name_sp_'+i);
                    product.find('#price_sp_1').attr('id','price_sp_'+i);
                    product.appendTo('.row_product');
                }

                data.Items.forEach(function(product){
                    //console.log("id:"+ product.idSP + "  +tenSP:", product.nameSP);
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
                    //console.log($(imgsp + index_sp).attr('src'));
                    $(namesp + index_sp + "").text(product.nameSP);
                    $(giasp + index_sp + "").text(product.info.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" VNĐ");
                    $(imgsp + index_sp).attr('src', product.info.images[0]);
                    $(namesp + index_sp + "").attr('href',"product-detail?id="+product.idSP);
                    $(giasp + index_sp + "").attr('aria-valuetext',product.info.price);
                    index_sp = index_sp + 1;
                });
                res.writeHead(200,{'Context-Type':'text/html'});
                res.write($.html());
                res.end();
            });
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanned all data...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }
        }
    }
});

///Get trang product-detail///////
app.get('/product-detail',function (req,res) {
    var route = url.parse(req.url,true).query;
    console.log(route);
    var id = route.id;
    var params = {
        TableName : "Product",
        KeyConditionExpression: "#id = :iddd",
        ExpressionAttributeNames:{
            "#id": "idSP"
        },
        ExpressionAttributeValues: {
            ":iddd": id
        }
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            fs.readFile(__dirname+"/product-detail.html",'utf8',function (err,data1) {
                var $ = cheerio.load(data1);
                data.Items.forEach(function(item) {
                    $('#name_sp').text(item.nameSP);
                    $('#price_sp').text(item.info.price+" VNĐ");
                    $('#img_1_1').attr('data-thumb',item.info.images[0]);
                    $('#img_1_2').attr('src',item.info.images[0]);
                    $('#img_2_1').attr('data-thumb',item.info.images[1]);
                    $('#img_2_2').attr('src',item.info.images[1]);
                    $('#img_3_1').attr('data-thumb',item.info.images[2]);
                    $('#img_3_2').attr('src',item.info.images[2]);
                    $('#des').text(item.info.des);
                });
                res.writeHead(200,{'Context-Type':'text/html'});
                res.write($.html());
                res.end();
            })
        }
    });
})

app.get('/cart',function (req,res) {
    fs.readFile(__dirname+"/cart.html",'utf8',function (err,data) {
        res.writeHead(200,{'Context-Type':'text/html'});
        res.write(data);
        res.end();
    });
})

var server = app.listen(8088,function () {
    var port = server.address().port;
    console.log("Server running at port :",port);
});
