const AdmZip = require('adm-zip');
const fs = require('fs');

exports.zipper = async function (sourceDir, outPutFile) {
    console.log("zipper", {sourceDir, outPutFile})
    return new Promise(function (resolve, reject) {
        try {
            const zip = new AdmZip();
            zip.addLocalFolder(sourceDir);
            zip.writeZip(outPutFile);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

exports.unzipper = async function (inputFile, outputDir) {
    console.log("unzipper", {inputFile, outputDir})
    return new Promise(function (resolve, reject) {
        try {
            var zip = new AdmZip(inputFile);
            zip.extractAllTo(outputDir, true);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}