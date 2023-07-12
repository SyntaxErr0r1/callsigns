//split the files from xml/ into xml/train, xml/validation, xml/test based on the ratio of 0.7, 0.15, 0.15

var fs = require('fs');
var path = require('path');

var xmlDir = path.join(__dirname, 'xml');
var trainDir = path.join(__dirname, 'xml/train');
var validationDir = path.join(__dirname, 'xml/validation');
var testDir = path.join(__dirname, 'xml/test');

var trainRatio = 0.8;
var validationRatio = 0.12;
var testRatio = 0.08;

var files = fs.readdirSync(xmlDir);
var trainFiles = [];
var validationFiles = [];
var testFiles = [];

var trainCount = 0;
var validationCount = 0;
var testCount = 0;

for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var filePath = path.join(xmlDir, file);
    var stats = fs.statSync(filePath);
    if (stats.isFile()) {
        var random = Math.random();
        if (random < trainRatio) {
            trainFiles.push(file);
        } else if (random < trainRatio + validationRatio) {
            validationFiles.push(file);
        } else {
            testFiles.push(file);
        }
    }
}

trainCount = trainFiles.length;
validationCount = validationFiles.length;
testCount = testFiles.length;

console.log('train: ' + trainCount);
console.log('validation: ' + validationCount);
console.log('test: ' + testCount);

console.log('copying train files...');
copyFiles(trainFiles, trainDir);
console.log('copying validation files...');
copyFiles(validationFiles, validationDir);
console.log('copying test files...');
copyFiles(testFiles, testDir);

function copyFiles(fileList, destDir) {

    if(!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
    }

    for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i];
        var filePath = path.join(xmlDir, file);
        var destPath = path.join(destDir, file);

        fs.rename(filePath, destPath, function (err) {
            if (err) throw err;
        });
    }
}