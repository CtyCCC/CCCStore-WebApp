var express = require('express');
var app = express();
var cheerio = require('cheerio');
var fs = require('fs');
var AWS = require('aws-sdk');
var url = require('url');
var path = require('path');
var session = require('express-session');
var passport = require('passport');
var bodyParser = require('body-parser');
var LocalStrategy = require('passport-local').Strategy
var port = process.env.PORT || 3000

/*Đọc dữ liệu root chuyển thành json (t cũng đéo biết :)) )*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// maxAge chỉnh thời gian tồn tại của cookie tính theo milisecond
app.use(session({
    secret : "secret",
    cookie:{maxAge:1000*60*5}
}))
// 2 middleware hỗ trợ cho cái passport chạy
app.use(passport.initialize());
app.use(passport.session());

/////Khai báo config cho aws sử dụng dynamodb
AWS.config.update({
    region: "us-west-2",
    //endpoint: "http://dynamodb.us-west-2.amazonaws.com"
    endpoint: "http://localhost:8000"
});

AWS.config.accessKeyId="AKIAI4WFTJMWNCDGC4WA";
AWS.config.secretAccessKey="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";

var docClient = new AWS.DynamoDB.DocumentClient();

/*Xử lý việc đăng nhập trả kết quả cho thằng passport.authenticate*/
passport.use(new LocalStrategy(
    function (username,password,done) {
        var params = {
            TableName: "Customers",
            ProjectionExpression: "#user ,#pass",
            FilterExpression: "#user = :u and #pass= :p",
            ExpressionAttributeNames: {
                "#user": "userName",
                "#pass":"password"
            },
            ExpressionAttributeValues: {
                ":u" : username,
                ":p" : password
            }
        };
        docClient.scan(params,function (err,data) {
            if(err)
                console.log('loi tim',err);
            else
            {
                var record = data.Items;
                if(record.length>0)
                {
                    return done(null,record[0]);
                }
                else
                {
                    return done(null,false);
                }
            }
        })
    }
))

//Tạo sesion cái idsession thì phải
passport.serializeUser(function(user, done) {
    done(null, user.userName);
});

/*Hiểu theo kiểu đây là chỗ tạo thằng req.user để lấy dữ liệu ấy
và thằng này dính với thằng trên
(thực ra username ở đây là iduser như éo có nên lấy username luôn)
* */
passport.deserializeUser(function(username, done) {
    var params = {
        TableName: "Customers",
        ProjectionExpression: "#user,password,Email,sdtKH,tenKH",
        FilterExpression: "#user = :u",
        ExpressionAttributeNames: {
            "#user": "userName",
        },
        ExpressionAttributeValues: {
            ":u" : username,
        }
    };
    docClient.scan(params,function (err,data) {
        if(err)
            console.log('loi session:',err);
        else
        {
            var record = data.Items;
            if(record.length>0)
            {
                return done(null,record[0]);
            }
            else
            {
                return done(null,false);
            }

        }
    })
});


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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
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
    var kq = path.basename(name);
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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
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
    var kq = path.basename(name);
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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
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
    var kq = path.basename(name);
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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
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
    var kq = path.basename(name);
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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
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
                //kiểm tra đã đăng nhập chưa
                if(req.isAuthenticated())
                {
                    $('#thongtinKH').removeAttr('hidden');
                    $('#btndangnhap').attr('hidden','');
                    $('#tenKH').text(req.user.tenKH);
                    $('#emailKH').text(req.user.Email);
                    $('#sdtKH').text(req.user.sdtKH);
                }
                res.writeHead(200,{'Context-Type':'text/html'});
                res.write($.html());
                res.end();
            })
        }
    });
})
// get post nó của route('/login')
app.route('/login')
    .get(function (req,res) {
        fs.readFile(__dirname+"/login.html",'utf8',function (err,data) {
        res.writeHead(200,{'Context-Type':'text/html'});
        res.write(data);
        res.end();
    })
})
    .post(passport.authenticate('local',{successRedirect: '/',failureRedirect:'/login'}))

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
            console.error("Ko thêm đc, lỗi gì đó . Error JSON:",JSON.stringify(err,null,2));
        } else {
            console.log("Thêm KH thành cmn công");
            var user ={
                "userName" : query.txtuser,
                "password" : query.txtpass,
                "sdtKH": query.txtsdt,
                "tenKH" : query.txtten,
                "Email" : query.txtmail
            }
            req.login(user,function (err) {
                if(err)
                    return err;
                else
                    return res.redirect('/');
            })
        }
    });
});

app.get('/cart',function (req,res) {
    fs.readFile(__dirname+"/cart.html",'utf8',function (err,data) {
        var $ =cheerio.load(data);
        if(req.isAuthenticated())
        {
            $('#thongtinKH').removeAttr('hidden');
            $('#btndangnhap').attr('hidden','');
            $('#tenKH').text(req.user.tenKH);
            $('#emailKH').text(req.user.Email);
            $('#sdtKH').text(req.user.sdtKH);
        }
        res.writeHead(200,{'Context-Type':'text/html'});
        res.write($.html());
        res.end();
    });
});
app.get('/logout',function (req,res) {
    req.logout();
    res.redirect('/');
});

var server = app.listen(port,function () {
    console.log("http://127.0.0.1:"+port+"/");
});
