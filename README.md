# disXourse

**[disxourse.com](https://www.disxourse.com)** was built to create a platform/community around discussing the latest arXiv papers with researchers in your field. The main goal of this website is to advance the concept of a journal club into something that is multi-institutional and connects researchers from all over the world. disXourse allows researchers to vote and comment on papers. This repository contains the source code for [disxourse.com](https://www.disxourse.com)


## Code

### Stack:
- **Database**: ``MongoDB ``
- **Backend**: ``Node.js`` (using ``Express.js`` framework)
- **Frontend**: Serverside rendering with ``EJS`` templating.  A bit of plain javascript and heavy usage of ``Bootstrap`` components.
- **Auth**: ``Passport`` with ``Google OAuth 2.0`` strategy
- **Mail**: ``Amazon SES``

### Code layout

The structure of the app roughly follows the MVC design pattern. Database models are stored in the ``/app/models/`` directory, ``EJS`` templates are in the ``/app/views/`` directory and the ``/app/routes/`` contains the logic for serving the routes. Helper functions used in the routes are defined in ``/app/helpers/``

New arxiv papers are downloaded daily using the [arxiv API](https://arxiv.org/help/api). This is scheduled by a cron job in the ``app/cron/`` directory which makes a call to ``/app /fetchPapers.js`` every night at 1 AM PST. 

### Developing locally
To run the webserver locally and start developing, you will need to first make sure you have ``node.js`` and ``npm`` and ``mongoDB``. 

After that, follow these steps: 

1. Clone the repository
	```
	git clone https://github.com/neerajkulk/disxourse.git
	``` 
2. Change into ``/app`` and install dependencies
	```
	cd app
	npm install
	```
3. You'll need to create a ``config.env`` file in ``/app/config/``. ``config.env`` should look like:
	```
	ENV = DEV
	PORT = 3000
	MONGO_URI = mongodb://localhost:27017/disxourse
	```
3. Start ``mongoDB ``  as Daemon
	```
	mongod --fork --logpath /var/log/mongodb/mongod.log
	```
4. Run server in development mode:
``npm run dev`` 
You should  see the following terminal output:
	```
	> nodemon
	[nodemon] 2.0.4
	[nodemon] to restart at any time, enter `rs`
	[nodemon] watching path(s): *.*
	[nodemon] watching extensions: js,mjs,json
	[nodemon] starting `node index.js`
	Server running in DEV mode at http://localhost:3000
	MongoDB connected
	```
5. Visit ``http://localhost:3000`` and start developing!
Let me know if you have any problems!


<br /> <br /> 

>If you like using disXourse, please consider contributing. Make a pull request or consider donating on  [patreon](https://www.patreon.com/disxourse). This will help cover server hosting costs and allow me to keep developing the site.
