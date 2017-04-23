'use strict'
const config = require('./config.js'),
    request = require('request'),
    fs = require('fs'),
    googleAuth = require('google-auth-library'),
    mime = require('mime-types'),
    path = require('path'),
    l = console.log,
    lib = require('googleapis');
class GoogleDrive {
    constructor(token) {
        this.token = token;
        this.baseUrl = 'https://content.googleapis.com/drive/v3';
        this.auth();
    }

    get(path, cb) {
        var options = {
            method: 'GET',
            url: this.baseUrl + path,
            headers:
            {
                authorization: this.token.credentials.token_type + ' ' + this.token.credentials.access_token
            }
        };

        request(options, (error, response, body) => {
            // console.log(typeof body);
            try {
                if (error) return cb(error);
                return ('string' !== body) ? cb(null, body) : cb(error, JSON.parse(body));
            } catch (e) {
                return cb(e);
            }
        });
    }

    post(path, data, cb) {
        var options = {
            method: 'POST',
            url: this.baseUrl + path,
            headers:
            {
                'content-type': 'application/json',
                authorization: this.token.credentials.token_type + ' ' + this.token.credentials.access_token
            },
            body: data,
            json: true
        };

        request(options, (error, response, body) => {
            // console.log(typeof body);
            try {
                if (error) return cb(error);
                return ('string' !== body) ? cb(null, body) : cb(error, JSON.parse(body));
            } catch (e) {
                return cb(e);
            }
        });
    }

    del(path, cb) {
        var options = {
            method: 'DELETE',
            url: this.baseUrl + path,
            headers:
            {
                'content-type': 'application/json',
                authorization: this.token.credentials.token_type + ' ' + this.token.credentials.access_token
            }
        };

        request(options, (error, response, body) => {
            // console.log(typeof body);
            try {
                if (error) return cb(error);
                return ('string' !== body) ? cb(null, body) : cb(error, JSON.parse(body));
            } catch (e) {
                return cb(e);
            }
        });

    }

    auth() {
        var str = fs.readFileSync('token.js').toString();
        var content = fs.readFileSync('client_secret.json');
        // Authorize a client with the loaded credentials, then call the
        // Drive API.
        // authorize(JSON.parse(content), listFiles);
        var credentials = JSON.parse(content);
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        // var auth = new new auth.OAuth2();
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
        // var auth = new 
        // oauth2Client.setC
        oauth2Client.credentials = JSON.parse(str);
        this.token = oauth2Client;
        this.drive = lib.drive({ version: 'v3', auth: oauth2Client });
    }

    fileList(cb) {
        this.get('/files', cb);
    }

    searchFiles(files, keyword) {
        return files.filter((file) => {
            return file.name.indexOf(keyword) > -1;
        })
    }

    // opts = {
    //     filepath : 'files/abc.xyz',
    //     folderId : [], null
    // }
    uploadFile(opts, cb) {
        var fileMetadata = {
            'name': path.basename(opts.filepath),
            // 'parents' : [opts.folderId]
        };

        if (opts.folderId) fileMetadata.parents = opts.folderId;
        var media = {
            mimeType: mime.lookup(fileMetadata.name),
            body: fs.createReadStream(opts.filepath)
        };
        this.drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        }, (err, file) => {
            if (err) {
                // Handle error
                // console.log(err);
                cb(err);
            } else {
                cb(null, file);
                // console.log('File Id: ', file.id);
            }
        });
    }

    createFolder(opts, cb) {
        opts.mimeType = 'application/vnd.google-apps.folder';
        this.drive.files.create({
            resource: opts,
            // fields: 'id'
        }, (err, file) => {
            if (err) {
                // Handle error
                // console.log(err);
                cb(err);
            } else {
                // console.log('Folder Id: ', file.id);
                cb(null, file);
            }
        });
    }

    copy(opts, cb) {
        var data = { name: 'new of ', parents: ['0B_FLfvXHR9YWTFNWdHA2WFcxN00'] };
        this.post('/files/' + opts.fileId + '/copy', data, cb);
    }

    // info()

    deleteFile(fileId, cb) {
        this.del({ fileId: fileId }, (e, r) => {
            return !!!e && !!!r;
        });
    }

    info(fileId, cb) {
        this.get('/files/' + fileId, cb);
    }

    share(opts, cb) {
        this.post('/files/' + opts.fileId + '/permissions', { role: 'reader', type: 'anyone' }, cb);
    }

    unshare(opts, cb) {
        var permissionId = opts.permissionId || 'anyoneWithLink';
        this.del(`/files/${opts.fileId}/permissions/${permissionId}`, cb);
    }

    move(opts, cb) {
        var fileId = opts.fileId,
            folderId = opts.folderId;
        // Retrieve the existing parents to remove
        this.drive.files.get({
            fileId: fileId,
            fields: 'parents'
        }, (err, file) => {
            if (err) {
                // Handle error
                // console.log(err);
                return cb(err);
            } else {
                // Move the file to the new folder
                var previousParents = file.parents.join(',');
                this.drive.files.update({
                    fileId: fileId,
                    addParents: folderId,
                    removeParents: previousParents,
                    fields: 'id, parents'
                }, (err, file) => {
                    if (err) {
                        // Handle error
                        return cb(err);
                    } else {
                        // File moved.
                        return cb(null, file);
                    }
                });
            }
        });
    }

    // share(fileId, callback) {
    //     // var fileId = '0B9klqHcaQnsDQVBFbnhjelBrbzQ';
    //     var sharePermission = {
    //         'type': 'anyone',
    //         'role': 'reader',
    //     }

    //     this.drive.permissions.create({
    //         resource: sharePermission,
    //         fileId: fileId,
    //         fields: 'id',
    //         auth: this.auth
    //     }, (err, res) => {
    //         if (err) {
    //             // console.log(err);
    //             callback(err);
    //         } else {
    //             // console.log('Permission ID: ', res)
    //             this.permissionId = res.id;
    //             callback(null, res.id);
    //         }
    //     });
    // }

    // unShare(fileId, permissionId, callback) {
    //     drive.permissions.delete({
    //         auth: this.auth,
    //         fileId: fileId,
    //         permissionId: permissionId
    //     }, (e, r) => {
    //         // console.log(e, r)
    //         if (e) return callback(e);
    //         callback(null, true);
    //     });
    // }
    // upload
}



var x = new GoogleDrive(config.token);
x.move({
    fileId: '0B_FLfvXHR9YWMmdOMVdadmpsRDg',
    folderId: '0B_FLfvXHR9YWM2NDUlVhZDhjZHM'
}, l)

// x.unshare({
//     fileId: '0B_FLfvXHR9YWd3hWV2RRTWJrOHc'
// }, l)

// x.del('/files/0B_FLfvXHR9YWdlpOOG1BTkptM2c', l);

// x.copy({
//     fileId : '0B_FLfvXHR9YWOXJTX2djbm5tZVk'
// }, console.log);

// x.createFolder({
//     name : 'xsafa'
// }, console.log)


// x.fileList(console.log);


// x.uploadFile({
//     filepath : 'download.jpg',
//     folderId : ['0B_FLfvXHR9YWOUtLSHBhSHNKYjQ']
// }, console.log)


// x.auth(console.log)
// console.log(x.token);
// // var drive = lib.drive({ version: 'v3' });
// // console.log(drive);
// var fileMetadata = {
//     'name': 'photo.jpg'
// };
// var media = {
//     mimeType: 'image/jpeg',
//     body: fs.createReadStream('download.jpg')
// };
// drive.files.create({
//     resource: fileMetadata,
//     media: media,
//     fields: 'id',
// }, function (err, file) {
//     if (err) {
//         // Handle error
//         console.log(err);
//     } else {
//         console.log('File Id: ', file.id);
//     }
// });