Serves up the content of a local directory to everyone who logs in with an allowed email address.

## Usage


	var makePrivateServer = require('private-static-website')

	var options = {

	}

	var server = makePrivateServer(options)

	server.start(8080)

	server.updateUsers([
		'you@yourdomain.com',
		'yourfriend@gmail.com'
	])

### Options

- privateContentPath: the local path with the content to be served to authenticated users
- transportOptions: [transport options](https://github.com/andris9/nodemailer-smtp-transport#usage) to be passed to nodemailer
- defaultMailOptions: default values for the "[e-mail message fields](https://github.com/andris9/Nodemailer#e-mail-message-fields)" to be passed to nodemailer
- getEmailText: a function that takes a login token and returns a string of html to be sent as the login email
- domain: the domain name that cookies should be set on
- db *(optional)*: if you would like user's sessions to be persisted, you may pass in a levelup database for them to be stored in


## Primarily composed of

- [just-login](http://justlogin.xyz/) for email address authentication
- [st](https://github.com/isaacs/st) for static file serving

## Todo

- logging out
