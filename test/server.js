const privateServer = require('../')
const path = require('path')
const http = require('http')

const options = {
	privateContentPath: __dirname + '/private',
	// db: levelmem('lol'),
	transportOptions: {
		host: 'mail.yourserver.com',
		port: 465,
		secureConnection: true,
		secure: true,
		// debug: true,
		tls: {
			ciphers: 'SSLv3',
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
		const site = 'http://localhost.com:8080'
		const url = path.join(site, '/public/auth') + '?token=' + token
		const emailHtml = '<p>Somebody is trying to log in as you!  If it is you, you should click on ' + 'this handy link'.link(url) + '</p>'
			+ '<p>If it isn\'t you, you should definitely NOT click on that link.</p>'
		return emailHtml
	},
	domain: 'localhost.com'
}

const server = privateServer(options, http.createServer())

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
