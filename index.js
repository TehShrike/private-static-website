const ecstatic = require('ecstatic')
const socketio = require('socket.io')
const Cookie = require('cookies')
const uuid = require('random-uuid-v4')
const JustLoginCore = require('just-login-core')
const justLoginDebouncer = require('just-login-debouncer')
const levelmem = require('level-mem')
const emailer = require('just-login-emailer')

const http = require('http')
const path = require('path')

const publicPath = '/public'
const sessionCookieId = 'sweetSessionIdentifier'
const tokenPrefix = public('auth?token=')

function public(str) {
	return path.join(publicPath, str)
}

function checkFor(obj, property) {
	if (!obj || typeof obj[property] === 'undefined') {
		throw new Error(`Options must have "${property}" property`)
	}
}

module.exports = function(options, server) {
	checkFor(options, 'privateContentPath')
	checkFor(options, 'transportOptions')
	checkFor(options, 'defaultMailOptions')
	checkFor(options, 'getEmailText')
	checkFor(options, 'domain')

	server = server || http.createServer()

	const jlc = JustLoginCore(options.db || levelmem('jlcDb'))
	const debounceDb = levelmem('debouncing')
	let usersWithAccess = {}

	justLoginDebouncer(jlc, debounceDb)
	emailer(jlc, options.getEmailText, options.transportOptions, options.defaultMailOptions, function(err) {
		if (err) {
			console.error('Error sending email!', err.message || err)
		}
	})

	function userHasAccess(emailAddress) {
		return !!usersWithAccess[emailAddress.toLowerCase()]
	}

	const serveContentFromRepo = ecstatic({
		root: options.privateContentPath,
		autoIndex: true,
		handleError: true
	})
	const servePublicContent = ecstatic({
		root: __dirname + '/public',
		baseDir: publicPath,
		handleError: true,
		autoIndex: true
	})

	const io = socketio(server)

	server.on('request', (req, res) => httpHandler({ serveContentFromRepo, servePublicContent, io, jlc, userHasAccess, domain: options.domain }, req, res))
	io.on('connection', socket => socketHandler({ jlc, userHasAccess, socket }))

	server.updateUsers = function updateUsers(contents) {
		try {
			const userEmailAddresses = Array.isArray(contents) ? contents : JSON.parse(contents)

			usersWithAccess = userEmailAddresses.map(function lc(str) {
				return str.toLowerCase()
			}).reduce(function(o, address) {
				o[address] = true
				return o
			}, {})
		} catch (e) {
			console.error('Error parsing JSON', contents, e.msg || e)
		}
	}

	return server
}

function httpHandler({ serveContentFromRepo, servePublicContent, io, jlc, userHasAccess, domain }, req, res) {
	const cookies = new Cookie(req, res)
	let sessionId = cookies.get(sessionCookieId)

	// session management
	if (!sessionId) {
		sessionId = uuid()
		cookies.set(sessionCookieId, sessionId, {
			domain: domain,
			httpOnly: false
		})
	}

	// routing
	if (req.url === public('session.js')) {
		res.setHeader('Content-Type', 'text/javascript')
		res.end(`${sessionCookieId}="${sessionId}"`)
	} else if (req.url.startsWith(tokenPrefix)) {
		const token = req.url.substr(tokenPrefix.length)

		jlc.authenticate(token, function(err, credentials) {
			let target = public('success.html')
			if (err) {
				console.error('Someone had an error authenticating at the token endpoint', err.message || err)
				target = public('index.html')
			} else {
				const sessionSocket = io.to(credentials.sessionId)
				sendAuthenticationMessageToClient(userHasAccess, sessionSocket.emit.bind(sessionSocket), credentials.contactAddress)
			}

			res.writeHead(303, {
				'Location': target
			})
			res.end()
		})
	} else if (req.url === '/public' || req.url.startsWith('/public/')) {
		servePublicContent(req, res)
	} else if (!req.url.startsWith('/socket.io/')) {
		jlc.isAuthenticated(sessionId, function(err, emailAddress) {
			if (err) {
				res.writeHead(500)
				res.end(err.message || err)
			} else if (emailAddress && userHasAccess(emailAddress)) {
				serveContentFromRepo(req, res)
			} else {
				res.writeHead(303, {
					'Location': public('index.html')
				})
				res.end()
			}
		})
	}
}

function socketHandler({ jlc, userHasAccess, socket }) {
	const sessionId = new Cookie(socket.request).get(sessionCookieId)
	if (sessionId) {
		socket.join(sessionId)
	} else {
		console.error('socket connection happened without a session! BORKED')
	}

	jlc.isAuthenticated(sessionId, function(err, emailAddress) {
		if (!err && emailAddress) {
			sendAuthenticationMessageToClient(userHasAccess, socket.emit.bind(socket), emailAddress)
		}
	})

	socket.on('beginAuthentication', function(sessionId, emailAddress) {
		if (sessionId && emailAddress) {
			jlc.beginAuthentication(sessionId, emailAddress, function(err, credentials) {
				if (err) {
					if (err.debounce) {
						socket.emit('warning', `Too many login requests! Please wait ${Math.round(credentials.remaining / 1000)}  seconds.`)
					} else {
						console.error('error?!?!?!', err.message || err)
					}
				}
			})
		}
	})
}

function sendAuthenticationMessageToClient(userHasAccess, emit, emailAddress) {
	if (userHasAccess(emailAddress)) {
		emit('authenticated', emailAddress)
	} else {
		emit('warning', `You are authenticated as ${emailAddress} but that user doesn't have access`)
	}
}
