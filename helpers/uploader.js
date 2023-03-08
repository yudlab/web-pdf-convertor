const multer = require('multer');
const { createFolderIfNotExist } = require('./filesHandler');
const uploadPath = process.cwd() + '/storage/uploads';

(async () => {
    await createFolderIfNotExist(uploadPath);
})();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

const upload = multer({ storage: storage }); 

module.exports = upload;

