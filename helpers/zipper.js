const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

exports.zipper = async function (sourceDir, outPutFile) {
    console.log("Zipper source: ", sourceDir);
    return new Promise(function (resolve, reject) {
        try {
            const zip = new AdmZip();
            zipFolder(zip, sourceDir);
            zip.writeZip(outPutFile);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function zipFolder(zip, folderPath) {
    try {
        const files = fs.readdirSync(folderPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                zip.addLocalFolder(filePath);
                zipFolder(filePath); // Recursively zip subdirectories
            } else if (stats.isFile()) {
                zip.addLocalFile(filePath);
            }
        }
    } catch (error) {
        return new Error(error)
    }
}

exports.unzipper = async function (inputFile, outputDir) {
    return new Promise(function (resolve, reject) {
        try {
            console.log("Unzipping input file: " + inputFile);
            console.log("Unzipping output dir: " + outputDir);
            var zip = new AdmZip(inputFile);
            zip.extractAllTo(outputDir, true);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}