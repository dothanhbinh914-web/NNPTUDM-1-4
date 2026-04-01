let multer = require('multer')
let path = require('path')

let storageSetting = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname)
        let filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext
        cb(null, filename)
    }
})

module.exports = {
    uploadFile: multer({
        storage: storageSetting,
        limits: { fileSize: 5 * 1024 * 1024 }
    })
}
