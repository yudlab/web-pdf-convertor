const AdmZip = require('adm-zip');
const fs = require('fs');

exports.zipper = async function (sourceDir, outPutFile) {
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

function zipFolder(zip, folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = folderPath + '/' + file;
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                zip.addLocalFolder(filePath);
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
            var zip = new AdmZip(inputFile);
            zip.extractAllTo(outputDir, true);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}