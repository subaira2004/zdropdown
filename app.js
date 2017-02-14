var express = require("express");
var fs = require("fs");
var app = express();

app.use(express.static(__dirname + '/'));
app.get("/", function (req, res) {
    fs.readFile(__dirname + "/zdropdown-example.html", "utf8", function (err, data) {
        res.send(data);
    });
});

app.get("/zdd", function (req, res) {
    //if (req.query.TakeDataFrom == 0) {
    fs.readFile(__dirname + "/Test_Static_Data/data_0_100.json", "utf8", function (err, data) {
        res.send(data);
    });
    //}
});
app.listen(3000, function () {
    console.log("listening...\npress 'Ctrl + C' to stop listening")
});