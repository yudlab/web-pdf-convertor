const express = require('express');
const router = express.Router();
const upload = require('../helpers/uploader');
const uploadController = require('../controllers/upload.controller');

router.get('/', uploadController.index);
router.post('/upload-multiple', upload.array('files', 50), uploadController.uploadMultiple);

module.exports = router;
