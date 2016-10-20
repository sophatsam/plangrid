const schedule = require('node-schedule');
const Logger = require('config/logger');

// Reference controllers
const Projects = require('./controllers/projects/controller');
const Issues = require('./controllers/issues/controller');

// Project Schedule to poll the API
let pRule = new schedule.RecurrenceRule();
pRule.minute = 57;  // Runs 57 minutes after every hour

var pj = schedule.scheduleJob(pRule, () => {
	let now = new Date();
	Logger.info('Projects scheduled task started: ', now);
	Projects.getProjects();
});

// Issue Schedule to poll the API
let iRule = new schedule.RecurrenceRule();
iRule.minute = 58;  // Runs 58 minutes after every hour

var ij = schedule.scheduleJob(iRule, () => {
	let now = new Date();
	Logger.info('Issues scheduled task started: ', now);
	Issues.getIssues();
});