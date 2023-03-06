const upload = require("../helpers/uploader");
const convertor = require("../helpers/convertor");

exports.index = (req, res) => {
    return res.render('index', { message: req.flash() });
}

exports.uploadMultiple = async (req, res) => {
    if (req.files.length) {
        const resp = await convertor(req.files);
        if ( resp.error ){
            req.flash('error', `An error occured: \n\n${resp.error_message}`);
        } else {
            req.flash('success', [`${resp.nb_files} Files converted, here's a link: `, `${resp.linkToZIP}`, `${resp.status}`]);
        }
    }
    return res.redirect('/');
}