var express = require('express');
var app = express();
var cheerio = require('cheerio'); //thay đổi thuộc tính html
var fs = require('fs');
var AWS = require('aws-sdk');
var url = require('url');
var path = require('path'); //bỏ dấu / trong name (root)
var session = require('express-session');

//passport
var passport = require('passport');
var bodyParser = require('body-parser');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

var nodemailer = require('nodemailer'); //gửi mail
var port = process.env.PORT || 3000;

//lấy image icon bootstrap css trong folder public
app.use('/public', express.static('public'));

app.use(flash()); //use for login fail

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

AWS.config.accessKeyId="AKIAJZYP7FWFEJWB4YIQ";
AWS.config.secretAccessKey="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";

var docClient = new AWS.DynamoDB.DocumentClient();

/*Xử lý việc đăng nhập trả kết quả cho thằng passport.authenticate*/
passport.use(new LocalStrategy(
    function (username,password,done) {
        var params = {
            TableName: "Customers",
            ProjectionExpression: "#user ,#pass",
            KeyConditionExpression: "#user = :u and #pass= :p",
            ExpressionAttributeNames: {
                "#user": "userName",
                "#pass":"password"
            },
            ExpressionAttributeValues: {
                ":u" : username,
                ":p" : password
            }
        };
        docClient.query(params,function (err,data) {
            if(err)
                console.log('Lỗi tìm',err);
            else
            {
                var record = data.Items;
                if(record.length>0) {
                    return done(null,record[0]);
                }
                else {
                    return done(null,false,{message:'Sai tài khoản hoặc mật khẩu'});
                }
            }

        })
    }
))

//Hàm được dùng để lưu thông tin user vào session nếu xác thực thành công
passport.serializeUser(function(user, done) {
    done(null, user.userName);
});

/*Hiểu theo kiểu đây là chỗ tạo thằng req.user để lấy dữ liệu ấy
và thằng này dính với thằng trên
(thực ra username ở đây là iduser như éo có nên lấy username luôn)
* */
//Hàm được gọi bởi passport.session, lấy dữ liệu user dựa vào thông tin lưu trên session và gắn vào req.user
passport.deserializeUser(function(username, done) {
    var params = {
        TableName: "Customers",
        //ProjectionExpression: "#user,password,Email,sdtKH,tenKH,diaChi,listSP",
        KeyConditionExpression: "#user = :u",
        ExpressionAttributeNames: {
            "#user": "userName",
        },
        ExpressionAttributeValues: {
            ":u" : username,
        }
    };
    docClient.query(params,function (err,data) {
        console.log('Đang tạo session');
        if(err)
            console.log('Lỗi session:',err);
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
            fs.readFile(__dirname+"/views/product.html",'utf8',function (err,data1) {

                var $ = cheerio.load(data1);
                //cái này cho 2 cái banner
                var banner1 = '#banner11';
                var banner2 = '#banner22';
                //gán cứng tạm, sau này thêm data cho 2 cái banner,giờ làm biếng tạo s3 quá, có 3 tấm hình
                //tại nếu có để thì phải mua đc, chứ bấm vào lại ko có gì
                $(banner1 + "").attr('href',"product-detail?id=LT006");
                $(banner2 + "").attr('href',"product-detail?id=LK009");
                
                //tạo thêm khung html để chứa các sản phẩm
                for(var i=2;i<data.Items.length;i++)
                {
                    var product = $('#boxstart').clone();//nhân đôi ô mặc định

                    //thay đổi id của thẻ
                    product.removeAttr('id');
                    product.find('#img_sp_1').attr('id','img_sp_'+i);
                    product.find('#name_sp_1').attr('id','name_sp_'+i);
                    product.find('#price_sp_1').attr('id','price_sp_'+i);
                    product.appendTo('.row_product');
                }

                //đưa dữ liệu vào
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
                    var dsSp = req.user.dsSP.id;
                    $('#cart-noti').text(dsSp.length+"");
                    $('#islogin').text("1");
                }
                res.writeHead(200,{'Context-Type':'text/html'});
                res.write($.html());
                res.end();
            });

            //scan thêm, mặc định lệnh scan chỉ quét đc 1MB
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

    var params = {
        TableName: "Product",
        ProjectionExpression: "idSP, nameSP, info",
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
            fs.readFile(__dirname+"/views/product.html",'utf8',function (err,data1) {

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

            // Scan thêm
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanned all data...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }
        }
    }
});

//pc trang pc
app.get('/PC',function (req,res) {
    var name = url.parse(req.url).pathname;
    var kq = path.basename(name);
    var params = {
        TableName: "Product",
        ProjectionExpression: "idSP, nameSP, info",
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
            fs.readFile(__dirname+"/views/product.html",'utf8',function (err,data1) {

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
//product/lịnhkien trang linhkien
app.get('/linhkien',function (req,res) {
    var name = url.parse(req.url).pathname;
    var kq = path.basename(name);
    var params = {
        TableName: "Product",
        ProjectionExpression: "idSP, nameSP, info",
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
            fs.readFile(__dirname+"/views/product.html",'utf8',function (err,data1) {

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
        ProjectionExpression: "idSP, nameSP, info",
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
            fs.readFile(__dirname+"/views/product.html",'utf8',function (err,data1) {

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
            fs.readFile(__dirname+"/views/product.html",'utf8',function (err,data1) {

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
            fs.readFile(__dirname+"/views/product-detail.html",'utf8',function (err,data1) {
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
        fs.readFile(__dirname+"/views/login.html",'utf8',function (err,data) {
        var $ =cheerio.load(data);
        $('#thongbao').text(req.flash('error')[0]);
        res.writeHead(200,{'Context-Type':'text/html'});
        res.write($.html());
        res.end();
    })
})
    .post(passport.authenticate('local',{successRedirect: '/',failureRedirect:'/login',failureFlash: true }))

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
            "Email" : query.txtmail,
            "diaChi" : query.txtdiachi
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
                "Email" : query.txtmail,
                "diaChi" : query.txtdiachi
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
    if(req.isAuthenticated())
    {
        var dsSp = req.user.dsSP.id;
        var soluong = req.user.dsSP.sl;
        if(dsSp.length>0){
            var count = 1;
            var params = {TableName : "Product"};
            docClient.scan(params, onScan);
            function onScan(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                } else {
                    fs.readFile(__dirname+"/views/cart.html",'utf8',function (err,data1){
                        var $ =cheerio.load(data1);
                        $('#thongtinKH').removeAttr('hidden');
                        $('#btndangnhap').attr('hidden','');
                        $('#tenKH').text(req.user.tenKH);
                        $('#emailKH').text(req.user.Email);
                        $('#sdtKH').text(req.user.sdtKH);

                        $('#thanhtoan').attr('href','/payment');
                        $('#islogin').text('1');
                        $('#rowstart').removeAttr('hidden');
                        $('#cart-noti').text(dsSp.length+"");
                        $('#slsp').text(dsSp.length);
                        if (dsSp.length>1){
                            for (var i=1; i<soluong.length; i++)
                            {
                                var Newrow = $('#rowstart').clone();
                                Newrow.removeAttr('id');
                                Newrow.find('#idimg1').attr('id','idimg'+(i+1));
                                Newrow.find('#idsp1').attr('id','idsp'+(i+1));
                                Newrow.find('#idgiasp1').attr('id','idgiasp'+(i+1));
                                Newrow.find('#tt_sp_1').attr('id','tt_sp_'+(i+1));
                                Newrow.find('#sl_sp_1').attr('id','sl_sp_'+(i+1));
                                Newrow.appendTo('.table-shopping-cart');
                            }
                        }
                        data.Items.forEach(function(item) {
                            for(var i=0; i<dsSp.length; i++){
                                if(dsSp[i]==item.idSP){
                                    var idsp = '#idsp'+count;
                                    $(idsp + "").text(item.nameSP);
                                    var idgiasp = '#idgiasp'+count;
                                    $(idgiasp + "").text(item.info.price);
                                    var idimg = '#idimg'+count;
                                    $(idimg + "").attr('src',item.info.images[0]);
                                    var sl_sp = '#sl_sp_'+count;
                                    $(sl_sp + "").attr('value',soluong[count-1]);
                                    var tt = item.info.price * soluong[count-1];
                                    var tt_sp = '#tt_sp_'+count;
                                    $(tt_sp).text(tt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" VNĐ");
                                    count++;
                                }
                            }
                        });
                        res.writeHead(200,{'Context-Type':'text/html'});
                        res.write($.html());
                        res.end();
                    });
                }
                if (typeof data.LastEvaluatedKey != "undefined") {
                    console.log("Scanned all data...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    docClient.scan(params, onScan);
                }
            }
        }
    }else{
        fs.readFile(__dirname+"/views/cart.html",'utf8',function (err,data) {
            var $ =cheerio.load(data);
            res.writeHead(200,{'Context-Type':'text/html'});
            res.write($.html());
            res.end();
        });
    }
});

app.get('/payment',function (req,res) {
    fs.readFile(__dirname+"/views/payment.html",'utf8',function (err,data) {

        var $ =cheerio.load(data);

        if(req.isAuthenticated()) {
            $('#thongtinKH').removeAttr('hidden');
            $('#btndangnhap').attr('hidden', '');
            $('#tenKH').text(req.user.tenKH);
            $('#emailKH').text(req.user.Email);
            $('#sdtKH').text(req.user.sdtKH);
        }

        $('#ten').val(req.user.tenKH);
        $('#mail').val(req.user.Email);
        $('#sdt').val(req.user.sdtKH);
        $('#diachi').val(req.user.diaChi);

        res.writeHead(200,{'Context-Type':'text/html'});
        res.write($.html());
        res.end();
    });
});

app.get('/paymentfunction',function (req,res) {

    var root = url.parse(req.url, true);
    var query = root.query;
    var email = query.txtemail;
    var ten = query.txttenKH;
    var sdt = query.txtsdt;
    var dc = query.txtdiachi;
    var gc = query.txtghichu;

    var noidung = '\t\t\t THÔNG TIN ĐƠN HÀNG'
        + '\n\t Tên: ' + ten
        + '\n\t SDT: ' + sdt
        + '\n\t Địa chỉ giao hàng: ' +dc
        + '\n\t Thời gian giao hàng dự kiến: 3-4 ngày làm việc'
        + '\n\t Ghi chú cho shiper: ' + gc
        + '\n\t Chi tiết tại: www.cccstore.tk';

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'cccstore.pc@gmail.com',
            pass: 'Chienpro123'
        }
    });

    var mailOptions = {
        from: 'cccstore.pc@gmail.com',
        to: email,
        subject: 'Xác nhận đơn hàng từ CCCStore',
        text: noidung
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    //cập nhật thông tin KH
    var params = {
        TableName:"Customers",
        Key:{
            "userName": req.user.userName,
            "password": req.user.password
        },
        UpdateExpression: "set sdtKH = :sdt, tenKH=:ten, Email=:email, diaChi = :dc ",
        ExpressionAttributeValues:{
            ":sdt" : query.txtsdt,
            ":ten" : query.txttenKH,
            ":email" : query.txtemail,
            ":dc" : query.txtdiachi
        },
        ReturnValues:"UPDATED_NEW"
    };

    console.log("Updating thoong tin khách hàng...");
    docClient.update(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        }
    });
	
	res.redirect('/');
});

app.get('/logout',function (req,res) {
    req.logout();
    res.redirect('/');
});

var server = app.listen(port,function () {
    console.log("http://127.0.0.1:"+port+"/");
});
