var ALY = require('../core');
var inherit = ALY.util.inherit;

/**
 * @api private
 */
ALY.Signers.OTS = inherit(ALY.Signers.RequestSigner, {

  subResources: {
    'acl': 1,
    'cors': 1,
    'lifecycle': 1,
    'delete': 1,
    'location': 1,
    'logging': 1,
    'notification': 1,
    'partNumber': 1,
    'policy': 1,
    'requestPayment': 1,
    'restore': 1,
    'tagging': 1,
    'torrent': 1,
    'uploadId': 1,
    'uploads': 1,
    'versionId': 1,
    'versioning': 1,
    'versions': 1,
    'website': 1
  },

  // when building the stringToSign, these querystring params should be
  // part of the canonical resource string with their NON-encoded values
  responseHeaders: {
    'response-content-type': 1,
    'response-content-language': 1,
    'response-expires': 1,
    'response-cache-control': 1,
    'response-content-disposition': 1,
    'response-content-encoding': 1
  },

  addAuthorization: function addAuthorization(credentials, date) {
    this.request.headers['x-ots-date'] = ALY.util.date.rfc822(date);
    this.request.headers['x-ots-accesskeyid'] = credentials.accessKeyId;

    var signature = this.sign(credentials.secretAccessKey, this.stringToSign());

    this.request.headers['x-ots-signature'] = signature;
  },

  stringToSign: function stringToSign() {
    var r = this.request;

    var parts = [];

    parts.push(r.path);

    parts.push(r.method + '\n');

    var headers = this.canonicalizedHeaders();
    if (headers) parts.push(headers);
    //parts.push(this.canonicalizedResource());

    return parts.join('\n') + '\n';
  },

  canonicalizedHeaders: function canonicalizedHeaders() {

    var headers = [];

    ALY.util.each(this.request.headers, function (name) {
      if (name.match(/^x-ots-/i))
        headers.push(name);
    });

    headers.sort(function (a, b) {
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
    });

    var parts = [];
    ALY.util.arrayEach.call(this, headers, function (name) {
      parts.push(name.toLowerCase() + ':' + String(this.request.headers[name]));
    });

    return parts.join('\n');

  },

  canonicalizedResource: function canonicalizedResource() {

    var r = this.request;

    var parts = r.path.split('?');
    var path = parts[0];
    var querystring = parts[1];

    var resource = '';

    if (r.virtualHostedBucket)
      resource += '/' + r.virtualHostedBucket;

    // OSS ???????????????header ?????? Key ?????? url encode
    resource += decodeURIComponent(path);

    if (querystring) {

      // collect a list of sub resources and query params that need to be signed
      var resources = [];

      ALY.util.arrayEach.call(this, querystring.split('&'), function (param) {
        var name = param.split('=')[0];
        var value = param.split('=')[1];
        if (this.subResources[name] || this.responseHeaders[name]) {
          var subresource = { name: name };
          if (value !== undefined) {
            if (this.subResources[name]) {
              subresource.value = value;
            } else {
              subresource.value = decodeURIComponent(value);
            }
          }
          resources.push(subresource);
        }
      });

      resources.sort(function (a, b) { return a.name < b.name ? -1 : 1; });

      if (resources.length) {

        querystring = [];
        ALY.util.arrayEach(resources, function (res) {
          if (res.value === undefined)
            querystring.push(res.name);
          else
            querystring.push(res.name + '=' + res.value);
        });

        resource += '?' + querystring.join('&');
      }

    }

    return resource;

  },

  sign: function sign(secret, string) {
    if(process.env.DEBUG == 'aliyun') {
      console.log('----------- sign string start -----------');
      console.log(string);
      console.log('----------- sign string end -----------');
    }
    return ALY.util.crypto.hmac(secret, string, 'base64', 'sha1');
  }
});

module.exports = ALY.Signers.OSS;
