var express = require('express');
var app = express();
var cheerio = require('cheerio');
var fs = require('fs');
var AWS = require('aws-sdk');
var url = require('url');
var pathh = require('path');
var port = process.env.PORT || 3000

/////Khai báo config cho aws sử dụng dynamodb
AWS.config.update({
    region: "us-west-2",
    //endpoint: "http://dynamodb.us-west-2.amazonaws.com"
    endpoint: "http://localhost:8000"
});

AWS.config.accessKeyId="AKIAI4WFTJMWNCDGC4WA";
AWS.config.secretAccessKey="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";

var docClient = new AWS.DynamoDB.DocumentClient();
var login = false;
var dem = 1;
var tenKH ="";
var sdtKH = "";
var emailKH = "";
var user = "";

//lấy image icon bootstrap css trong folder public
app.use('/public', express.static('public'));


////Get trang product//////
app.get("/",function (req,res) {
    var params={TableName:"Product"};
    var index_sp = 1;
    docClient.scan(params, onScan);
    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Scan product succeeded.");
            fs.readFile(__dirname+"/product.html",'utf8',function (err,data1) {

                var $ = cheerio.load(data1);

                if(login==false && dem>1){
                    $('#dangnhap').css('display', 'block');
                    $('#thongbao').text('Sai tài khoản hoặc mật khẩu !!!')
                }
                if (login==true){
                    $('#thongtinKH').removeAttr('hidden');
                    $('#dangnhapbtn').attr('hidden', 'true');
                    $('#tenKH').text(tenKH);
                    $('#sdtKH').text(sdtKH);
                    $('#emailKH').text(emailKH);
                }
                //cái này cho 2 cái banner
                var banner1 = '#banner11';
                var banner2 = '#banner22';
                //gán cứng tạm, sau này thêm data cho 2 cái banner,giờ làm biếng tạo s3 quá, có 3 tấm hình
                //tại nếu có để thì phải mua đc, chứ bấm vào lại ko có gì
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");
                
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

//product/latop trang laptop
app.get("/Laptop",function (req,res) {
    var name = url.parse(req.url).pathname;
    var kq = pathh.basename(name);
    console.log(kq);
    var params = {
        TableName: "Product",
        ProjectionExpression: "nameSP, info",
        //FilterExpression: "info.#type = :t",
        FilterExpression: "#type = :t",
        ExpressionAttributeNames: {
            "#type": "type",
        },
        ExpressionAttributeValues: {
            ":t" : kq
        }
    };
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
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");

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

//    /pc trang pc
app.get('/PC',function (req,res) {
    var name = url.parse(req.url).pathname;
    var kq = pathh.basename(name);
    var params = {
        TableName: "Product",
        ProjectionExpression: "nameSP, info",
        //FilterExpression: "info.#type = :t",
        FilterExpression: "#type = :t",
        ExpressionAttributeNames: {
            "#type": "type",
        },
        ExpressionAttributeValues: {
            ":t" : kq
        }
    };
    var index_sp = 1;
    docClient.scan(params, onScan);
    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Scan succeeded.");
            fs.readFile(__dirname+"/product.html",'utf8',function (err,data1) {

                var $ = cheerio.load(data1);
                $('#formtimkiem').attr('action',"PC");


                //cái này cho 2 cái banner
                var banner1 = '#banner11';
                var banner2 = '#banner22';
                //gán cứng tạm, sau này thêm data cho 2 cái banner,giờ làm biếng tạo s3 quá, có 3 tấm hình
                //tại nếu có để thì phải mua đc, chứ bấm vào lại ko có gì
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");

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
//product/lịnhkien trang linhkien
app.get('/linhkien',function (req,res) {
    var name = url.parse(req.url).pathname;
    var kq = pathh.basename(name);
    var params = {
        TableName: "Product",
        ProjectionExpression: "nameSP, info",
        //FilterExpression: "info.#type = :t",
        FilterExpression: "#type = :t",
        ExpressionAttributeNames: {
            "#type": "type",
        },
        ExpressionAttributeValues: {
            ":t" : kq
        }
    };
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
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");

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

// /phukien trang phukien
app.get('/phukien',function (req,res) {
    var name = url.parse(req.url).pathname;
    var kq = pathh.basename(name);
    var params = {
        TableName: "Product",
        ProjectionExpression: "nameSP, info",
        //FilterExpression: "info.#type = :t",
        FilterExpression: "#type = :t",
        ExpressionAttributeNames: {
            "#type": "type",
        },
        ExpressionAttributeValues: {
            ":t" : kq
        }
    };
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
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");

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

//////Product/Tim theo giá/////
app.get("/search",function (req,res) {
    var route = url.parse(req.url,true).query;
    var upper = Number(route.upper)*1000000;
    var lower = Number(route.lower)*1000000;

    var params = {
        TableName:"Product",
        ProjectionExpression:"nameSP , info",
        FilterExpression: "info.price between :p1 and :p2",
        ExpressionAttributeValues:{
            ":p1": lower,
            ":p2": upper,
        }
    };
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
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");

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
                    $('#price_sp').text(item.info.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" VNĐ");
                    $('#price_sp').attr('aria-valuetext',item.info.price);
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

app.get('/login',function (req,res) {

    var root = url.parse(req.url, true);
    var query = root.query;
    var params={TableName:"Customers"};
    docClient.scan(params, onScan);
    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Scan customers succeeded.");
            data.Items.forEach(function (cus) {
               if (cus.userName == query.username && cus.password == query.pass){
                   login=true;
                   res.redirect('/');
                   tenKH = cus.tenKH;
                   sdtKH = cus.sdtKH;
                   emailKH = cus.Email;
                   user = cus.userName;
                   console.log("Đã đăng nhập vào user: " +query.username);
               }
            });
            if (login==false){
                dem=dem+1;
                console.log('Sai tài khoản hoặc mật khẩu!!!');
                res.redirect('/');
            }
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanned all data...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }
        }
    };
});

app.get('/signup',function (req,res) {
    var root = url.parse(req.url, true);
    var query = root.query;
    var params = {
        TableName: "Customers",
        Item: {
            "userName" : query.txtuser,
            "password" : query.txtpass,
            "sdtKH": query.txtsdt,
            "tenKH" : query.txtten,
            "Email" : query.txtmail
        }
    };
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add movie . Error JSON:",JSON.stringify(err,null,2));
        } else {
            console.log("Thêm KH thành cmn công");
            login=true;
        }
    });
});

app.get('/cart',function (req,res) {
    fs.readFile(__dirname+"/cart.html",'utf8',function (err,data) {
        //nếu đã đăng nhập, load giỏ hàng cũ từ db
        if (login == true){
            var params = {
                TableName : "Customers",
                KeyConditionExpression: "#user = :user",
                ExpressionAttributeNames:{
                    "#user": "userName"
                },
                ExpressionAttributeValues: {
                    ":user": user
                }
            };
            docClient.query(params, function(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                } else {
                    data.Items.forEach(function(item) {
                        console.log("Tên: " +item.tenKH + "   SDT: " +item.sdtKH + "   Email: "+item.Email)
                    });
                }
            });
        }
        res.writeHead(200,{'Context-Type':'text/html'});
        res.write(data);
        res.end();
    });
});
app.get('/logout',function (req,res) {
    login = false;
    dem = 1;
    tenKH ="";
    sdtKH = "";
    emailKH = "";
    user = "";
    res.redirect('/');
});

var server = app.listen(port,function () {
    console.log("http://127.0.0.1:"+port+"/");
});
