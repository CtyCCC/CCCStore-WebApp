var express = require('express');
var app = express();
var cheerio = require('cheerio'); //thay đổi thuộc tính html
var fs = require('fs');
var AWS = require('aws-sdk');
var url = require('url');
var path = require('path'); //bỏ dấu / trong name (root)
var session = require('express-session');
var cookieParser =require('cookie-parser');
var FacebookStrategy =require('passport-facebook').Strategy;
var GoogleStrategy =require('passport-google-oauth').OAuth2Strategy;

//passport
var passport = require('passport');
var bodyParser = require('body-parser');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

var nodemailer = require('nodemailer'); //gửi mail
var port = process.env.PORT || 4000;

//lấy image icon bootstrap css trong folder public
app.use('/public', express.static('public'));
app.use(cookieParser());
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
//endpoint: "http://dynamodb.us-west-2.amazonaws.com"
AWS.config.loadFromPath('configDynamoDB.json');

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
                console.log(err);
            else
            {
                var record = data.Items;
                if(record.length>0) {
                    return done(null,record[0]);
                    qqq
                }
                else {
                    return done(null,false,{message:'Sai tài khoản hoặc mật khẩu'});
                }
            }

        })
    }
))
passport.use(new FacebookStrategy({
        clientID: "322620955226186",
        clientSecret: "8786f9e622100eeca2d4519b75e1383b",
        callbackURL: "https://www.shopccc.tk/auth/facebook/callback",
        profileFields: ['email']
    },
    function(accessToken, refreshToken, profile, done) {
        var params = {
            TableName: "Customers",
            ProjectionExpression: "#user",
            KeyConditionExpression: "#user = :u",
            ExpressionAttributeNames: {
                "#user": "userName",
            },
            ExpressionAttributeValues: {
                ":u" : profile.id,
            }
        };
        docClient.query(params,function (err,data) {
            if(err)
                console.log(err);
            else
            {
                var record = data.Items;
                if(record.length>0)
                {
                    return done(null,record[0]);
                }
                else
                {
                    var user = {
                        TableName: "Customers",
                        Item: {
                            "userName" : profile.id,
                            "password" :'facebook',
                            "sdtKH": '1',
                            "tenKH" : profile.displayName,
                            "Email" : profile.emails[0].value,
                            "diaChi" : '1',
                            "dsSP":{
                                'id':[],
                                'sl':[]
                            }
                        }
                    };
                    docClient.put(user, function(err) {
                        if(err)
                            console.log('loi',JSON.stringify(err));
                        else{
                            var record = user.Item;
                            console.log('them moi');
                            return done(null,record);
                        }

                    })
                }
            }
        })

    }
));

passport.use(new GoogleStrategy({
        clientID: "3723581223-m2ie4igv3skm33ddblvromiuhait1q9b.apps.googleusercontent.com",
        clientSecret: "ujbKyzszypg7O4uVWRSzqvyP",
        callbackURL: "https://www.shopccc.tk/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        var params = {
            TableName: "Customers",
            ProjectionExpression: "#user",
            KeyConditionExpression: "#user = :u",
            ExpressionAttributeNames: {
                "#user": "userName",
            },
            ExpressionAttributeValues: {
                ":u" : profile.id,
            }
        };
        docClient.query(params,function (err,data) {
            if(err)
                console.log(err);
            else
            {
                var record = data.Items;
                if(record.length>0)
                {
                    return done(null,record[0]);
                }
                else
                {
                    var user = {
                        TableName: "Customers",
                        Item: {
                            "userName" : profile.id,
                            "password" :'google',
                            "sdtKH": '1',
                            "tenKH" : profile.displayName,
                            "Email" : profile.emails[0].value,
                            "diaChi" : '1',
                            "dsSP":{
                                'id':[],
                                'sl':[]
                            }
                        }
                    };
                    docClient.put(user, function(err) {
                        if(err)
                            console.log('loi',JSON.stringify(err));
                        else{
                            var record = user.Item;
                            console.log('them moi');
                            return done(null,record);
                        }

                    })
                }
            }
        })

    }
));

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
        if(err)
            console.log(err);
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
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
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
                    $('#islogin').text("1");
                    var check = decodeURIComponent((req.cookies).check);
                    if(check != 1){
                        var dsSp = req.user.dsSP.id;
                        $('#slsp').text(dsSp.length);
                        data.Items.forEach(function(item){
                            for (var i = 0 ; i<dsSp.length;i++){
                                if(dsSp[i]==item.idSP){
                                    var ob = {'name':item.nameSP,'price':item.info.price,'image':item.info.images[0],'sl':req.user.dsSP.sl[i]};
                                    res.cookie('sp'+(i+1),JSON.stringify(ob));
                                }
                            }
                        });
                    }
                }
                res.writeHead(200,{'Context-Type':'text/html'});
                res.write($.html());
                res.end();
            });

            //scan thêm, mặc định lệnh scan chỉ quét đc 1MB
            if (typeof data.LastEvaluatedKey != "undefined") {
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
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
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
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
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
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
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
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
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
                    var namesp = '#name_sp_';
                    var giasp = '#price_sp_';
                    var imgsp = '#img_sp_';
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

// Login FB và Login GG

app.get('/auth/facebook',passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook',{successRedirect: '/',failureRedirect:'/login'}));

app.get('/auth/google',passport.authenticate('google',
    { scope: ['https://www.googleapis.com/auth/plus.login','https://www.googleapis.com/auth/plus.profile.emails.read']}));
app.get('/auth/google/callback',
    passport.authenticate('google', {successRedirect: '/',failureRedirect: '/login' }));


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
    fs.readFile(__dirname+"/views/cart.html",'utf8',function (err,data) {

        var $ =cheerio.load(data);

        if(req.isAuthenticated())
        {
            $('#thongtinKH').removeAttr('hidden');
            $('#btndangnhap').attr('hidden','');
            $('#tenKH').text(req.user.tenKH);
            $('#emailKH').text(req.user.Email);
            $('#sdtKH').text(req.user.sdtKH);

            $('#thanhtoan').attr('href','/payment');
            $('#islogin').text('1');
            $('#slsp').text(req.user.dsSP.sl);
        }

        res.writeHead(200,{'Context-Type':'text/html'});
        res.write($.html());
        res.end();
    });
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

    ///Ds sp trong giỏ hàng
    var dl = req.cookies;
    var dssp=[];
    for (x in dl){
        try {
            var sp = {};
            var name = decodeURIComponent(JSON.parse(dl[x]).dh);
            var sl = Number(decodeURIComponent(JSON.parse(dl[x]).sl));
            var price = decodeURIComponent(JSON.parse(dl[x]).price);
            if(name != 'undefined' && sl != 'NaN' && price != 'undefined'){
                sp.name = name;
                sp.sl = sl;
                sp.price = price;
                dssp.push(sp);
            }
        }catch (e) {
            continue;
        }
    };

    //đưa thông tin đơn vào db
    var params = {
        TableName: "Orders",
        Item: {
            "sdt" : sdt,
            "ten" : ten,
            "email": email,
            "diachi" : dc,
            "ghichu" : gc,
            "dssp" : dssp
        }
    };
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add movie", ten, ". Error JSON:",JSON.stringify(err,null,2));
        } else {
            console.log("Thêm đơn hàng vào DB thành công:", ten);
        }
    });

    //nội dung email
    var tuade =  '\t\t\t\t\t\t THÔNG TIN ĐƠN HÀNG \n';
    var sanpham = '\n\tDanh sách sản phẩm:\n';
    var tongtien=0;
    for (var i=0;i<dssp.length;i++){
        sanpham=sanpham+'\n\t\t-'+dssp[i].name+', Số lương: ' + dssp[i].sl + ', Đơn giá: '
            + dssp[i].price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        tongtien=tongtien + Number(dssp[i].sl)*Number(dssp[i].price);
    }
    var thongtin = '\n\n\t Tên: ' + ten
        + '\n\t SDT: ' + sdt
        + '\n\t Địa chỉ giao hàng: ' +dc
        + '\n\t Tổng tiền: ' +tongtien.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" VNĐ"
        + '\n\t Thời gian giao hàng dự kiến: 3-4 ngày'
        + '\n\t Ghi chú cho shiper: ' + gc
        + '\n\t Mua thêm sản phẩm tại: www.cccstore.tk'
        + '\n\t Mọi thắc mắc liên hệ: support@cccstore.tk';
    var noidungmail = tuade + sanpham + thongtin;


    //gửi email by ses
    var aws = require('aws-sdk');
    aws.config.loadFromPath('configSES.json');
    var ses = new AWS.SES({apiVersion: '2010-12-01'});

    // @todo - add HTML version
    ses.sendEmail( {
            Source: 'verify@cccstore.tk',
            Destination: { ToAddresses: [email] },
            Message: {
                Subject:{
                    Data: 'Xác nhận đơn hàng từ CCC Store!'
                },
                Body: {
                    Text: {
                        Data: noidungmail,
                    }
                }
            }
        }
        , function(err, data) {
            if(err) throw err
            console.log('Ðã gửi email thành công !!');
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

    docClient.update(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        }
    });
});

app.get('/logout',function (req,res) {
    var data = req.cookies;
    var userName = req.user.userName;
    var pass = req.user.password;
    var sp=[],sl=[];
    var kt = 0;
    for( x in data){
        try {
            var ss = decodeURIComponent(JSON.parse(data[x]).key);
            if(decodeURIComponent(JSON.parse(data[x]).val) != 'undefined'){
                sl.push(decodeURIComponent(JSON.parse(data[x]).val));
            }
            if(ss != 'undefined'){
                var params1 = {
                    TableName: 'Product',
                    ProjectionExpression: '#id',
                    FilterExpression: '#name = :nnn',
                    ExpressionAttributeNames: {
                        '#id': "idSP",
                        '#name': "nameSP"
                    },
                    ExpressionAttributeValues: {
                        ":nnn": ss,
                    }
                };
                docClient.scan(params1, onScan);
                function onScan(err, data) {
                    if (err) {
                        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                    } else {
                        data.Items.forEach(function (item) {
                            sp.push(item.idSP);
                        });
                        if(sp.length == sl.length){
                            var params = {
                                TableName: 'Customers',
                                Key: {
                                    "userName": userName,
                                    "password": pass
                                },
                                UpdateExpression: "set dsSP.id = :i, dsSP.sl=:l",
                                ExpressionAttributeValues: {
                                    ":i": sp,
                                    ":l": sl,
                                },
                                ReturnValues: "UPDATED_NEW"
                            };
                            docClient.update(params, function (err, data) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    console.log(JSON.stringify(data));
                                }
                            });
                        }
                    }
                    if (typeof data.LastEvaluatedKey != "undefined") {
                        console.log("Scanning for more...");
                        params1.ExclusiveStartKey = data.LastEvaluatedKey;
                        docClient.scan(params1, onScan);
                    }
                };
                kt = 1;
            }
        }catch (e) {
            continue;
        }
    };
    if(kt == 0){
        var params = {
            TableName: 'Customers',
            Key: {
                "userName": userName,
                "password": pass
            },
            UpdateExpression: "set dsSP.id = :i, dsSP.sl=:l",
            ExpressionAttributeValues: {
                ":i": sp,
                ":l": sl,
            },
            ReturnValues: "UPDATED_NEW"
        };
        docClient.update(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                console.log(JSON.stringify(data));
            }
        });
    };
    res.clearCookie('check');
    req.logout();
    res.redirect('/');
});

//Để lấy danh sách email từ bảng khách hàng vài file txt
//mỗi tháng lấy 1 lần vào đàu tháng để gửi mail marketing
var date = new Date(); //ngày hệ thống

if (date.getDate()==12){
    var params = {
        TableName: "Customers",
        ProjectionExpression: "Email"
    };

    docClient.scan(params, onScan);

    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            var  dulieu = JSON.stringify(data);

            fs.writeFile('listemailkh.txt', dulieu, function(err) {
                if (err) {
                    return console.error(err);
                }
                console.log("Tạo file danh sách email thành công");
            });

            //scan thêm, m?c d?nh l?nh scan ch? quét dc 1MB
            if (typeof data.LastEvaluatedKey != "undefined") {
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }
        }
    }
}
else {
    console.log('Nay không phải ngày tạo ds email');
}

//để test hôy
app.get('/kh',function (req,res) {
    var params = {
        TableName: 'Customers',
        Key:{
            "userName": req.user.userName,
            "password": req.user.password
        }
    };
    docClient.get(params,function (err,data) {
        console.log(JSON.stringify(data));
    })
})

var server = app.listen(port,function () {
    console.log("http://127.0.0.1:"+port+"/");
});
