var express = require('express');
var app = express();

app.use('/public', express.static('public'))

app.get("/",function (req,res) {
    res.sendFile(__dirname+"/index.html");
});

app.get("/product",function (req,res) {
    res.sendFile(__dirname+"/product.html");
})


app.listen(8000);
