var privateServer = require('../')
var path = require('path')
var https = require('https')
var readFileSync = require('fs').readFileSync

var options = {
	privateContentPath: __dirname + '/private',
	// db: levelmem('lol'),
	transportOptions: {
		host: 'mail.yourserver.com',
		port: 465,
		secureConnection: true,
		secure: true,
		// debug: true,
		tls: {
			ciphers:'SSLv3',
			rejectUnauthorized: false
		},
		auth: {
			user: 'justlogin@yourserver.com',
			pass: ''
		}
	},
	defaultMailOptions: {
		from: 'justlogin@yourserver.com',
		subject: 'Log in to test site'
	},
	smtpServer: 'mail.yourserver.com',
	getEmailText: function(token) {
		var site = 'https://localhost.com:8080'
		var url = path.join(site, '/public/auth') + '?token=' + token
		var emailHtml = '<p>Somebody is trying to log in as you!  If it is you, you should click on ' + 'this handy link'.link(url) + '</p>'
			+ '<p>If it isn\'t you, you should definitely NOT click on that link.</p>'
		return emailHtml
	},
	domain: 'localhost.com'
}

var server = https.createServer({
	// passphrase: 'super secret test pass phrase',
	key: readFileSync(__dirname + '/server-key.pem'),
	cert: readFileSync(__dirname + '/server-cert.pem'),
	ca: [ readFileSync(__dirname + '/server-csr.pem') ]
})

// var server = require('http').createServer()

server = privateServer(options, server)

server.updateUsers([
	'you@wherever.com'
])

server.on('clientError', function(e) {
	console.error('client error', e.msg || e)
})
server.on('error', function(e) {
	console.error('error', e.msg || e)
})

server.listen(8080)
