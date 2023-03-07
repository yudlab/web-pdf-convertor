const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

exports.zipper = async function (sourceDir, outPutFile) {
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
}

exports.unzipper = async function (inputFile, outputDir) {
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