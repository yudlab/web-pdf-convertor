
const fs = require("fs");
const fs_promises = require('fs').promises;
require('dotenv').config()
const { zipper, unzipper } = require("./zipper");
const { convertToPDF } = require("./convertor");
const path = require('path');

function getIPAddress() {
  var interfaces = require("os").networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      )
        return alias.address;
    }
  }
  return "0.0.0.0";
}

const config = {
  server_address: `http://${getIPAddress()}:3000`,
};

console.info("Serving web service at: ", config.server_address);

const pathSeparator = (path) => {
  return path.replace(/\\/g, `/`);
};

async function createFolderIfNotExist(folderPath) {
  try {
    const stats = await fs_promises.stat(folderPath);
    if (stats.isDirectory()) {
    } else {
      throw new Error(`${folderPath} exists, but is not a directory.`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs_promises.mkdir(folderPath);
    } else {
      throw error;
    }
  }
}

const getFileWithoutExt = (str) => {
  return str.replace(/\.[^/.]+$/, "");
}

const getZipName = () => {
  const today = new Date();
  var dd = today.getDate();
  var mo = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();
  var hh = today.getHours();
  var mm = today.getMinutes();
  var ss = today.getSeconds();
  var ms = today.getMilliseconds();

  return `${dd < 9 ? `0` + dd : dd}-${mo < 9 ? `0` + mo : mo}-${yyyy}-${hh < 9 ? `0` + hh : hh}-${mm < 9 ? `0` + mm : mm}-${ss < 9 ? `0` + ss : ss}-${ms < 9 ? `0` + ms : ms}.zip`;
};

async function recursiveConvert(unconvertedPath, convertedPath, count) {
  return new Promise(async function(resolve, reject) {
    try {
      let fileCount = count;
      const files = await fs_promises.readdir(unconvertedPath);
      for (const file of files) {
        const filePathUnconverted = path.join(unconvertedPath, file);
        const stat = await fs_promises.stat(filePathUnconverted);
        if (stat.isDirectory()) {
          let newDirConverted = path.join(convertedPath, file);
          await createFolderIfNotExist(newDirConverted);
          let thisCount = await recursiveConvert(filePathUnconverted, newDirConverted, count);
          fileCount += thisCount;
        } else {
          await convertToPDF(filePathUnconverted, convertedPath);
          fs.unlinkSync(filePathUnconverted); //deletes the file.
          fileCount++
        }
      }
      return resolve(fileCount);
    } catch (error) {
      reject(error);
    }
  });
}

exports.filesHandler = function (files, paths) {
  return new Promise(async (resolve, reject) => {
    let resp = {
      linkToZIP: "",
      nb_files: 0,
    };

    if (typeof files !== "object" || files.length === 0) {
      resp.error = true;
      resp.error_message = "An error occured.(files)";
      reject();
    } else {
      let pdfDestination = pathSeparator(
        process.cwd() + "/storage/uploads/PDFs"
      );

      await createFolderIfNotExist(pdfDestination);

      let zipDestination = pathSeparator(process.cwd() + "/public/zip");
      let zipName = getZipName();
      let fullZipFilename = pathSeparator(zipDestination + "/" + zipName);

      for (var i = 0; i < files.length; i++) {
        let currentFile = files[i];
        let fullPath = pathSeparator( process.cwd() + "/storage/uploads/" + currentFile.filename );
        if(currentFile.mimetype === "application/x-zip-compressed") {
          //unzip to folder using zip name as folder name
          let zipFolder = pdfDestination + "/" + getFileWithoutExt(currentFile.filename);
          let folderNameUnconverted = zipFolder + "_unconverted";
          await createFolderIfNotExist(folderNameUnconverted);
          await createFolderIfNotExist(zipFolder);
          await unzipper(fullPath, folderNameUnconverted);
          let fileCount = await recursiveConvert(folderNameUnconverted, zipFolder, resp.nb_files);
          fs.rmSync(folderNameUnconverted, { recursive: true, force: true });
          fs.unlinkSync(fullPath); //deletes the file.
          resp.nb_files = resp.nb_files + fileCount;
        } else if(currentFile.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          try {
            resp.status = await convertToPDF(fullPath, pdfDestination);
            fs.unlinkSync(fullPath); //deletes the file.
            resp.nb_files = resp.nb_files + 1;
          } catch (error) {
            resp.error = true;
            resp.error_message = "An error occured: " + error;
            reject(error);
          }
        }
      }
      await zipper(pathSeparator(
        process.cwd() + "/storage/uploads"
      ), fullZipFilename);
      resp.linkToZIP = pathSeparator(config.server_address + "/zip/" + zipName);
      fs.rmSync(pdfDestination, { recursive: true, force: true });
    }
    resolve(resp);
  });
};

exports.createFolderIfNotExist = createFolderIfNotExist;