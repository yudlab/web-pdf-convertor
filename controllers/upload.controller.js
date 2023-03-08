const { filesHandler } = require("../helpers/filesHandler");

exports.index = (req, res) => {
    return res.render('index', { message: req.flash() });
}

exports.uploadMultiple = async (req, res) => {
    if (req.files.length) {
        try {
            const resp = await filesHandler(req.files);
            if ( resp.error ){
                req.flash('error', `An error occured: \n\n${resp.error_message}`);
            } else {
                req.flash('success', [`${resp.nb_files} ${resp.nb_files > 1 ? 'files' : 'file'} converted, click on the link below to download.`, `${resp.linkToZIP}`, `${resp.status}`]);
            }
        } catch (error) {
            return new Error(error)
        }
    }
    return res.redirect('/');
}