const models  = require('../../models');
const PG_config = require('../../config/config');
const moment = require('moment');
const tz = require('moment-timezone');
const Logger = require('../../config/logger');
const request = require('request');

// save to database
function createProject(project) {

	let now = moment();
	now.tz('America/Los_Angeles').format();
	let pid = project.name.substring(0, 5) // adjust according to your needs

	return models.Project
	.findOrCreate({
		where: { uid: project.uid },
		defaults: { 
			project_name: project.name,
			project_id: pid,
			updatedAt: now
		},
	})
	.spread((project, created) => {
		return project;
	})
}

// iterator over list
const iterateProjectlist = (projects, firstRequest) => {
	projects.data.forEach(response => {
		if (response.status_code === 200){
			var body = JSON.parse(response.body);
			body.data.forEach(project => createProject(project));
		}
	})

}

// get projects
const getProjectsFromPlanGrid = (requests) => {

	return new Promise((resolve, reject) => {

		var batchRequest = requests || [{"method": "GET", "path": "/projects"}]
		let options = {
			url: 'https://' + PG_config.plangrid.url + '/batch',
			auth: { 'user' : PG_config.plangrid.key },
			method: 'POST',
			headers: PG_config.plangrid.headers,
			json: batchRequest
		};

		let data = '';

		request(options)
			.on('data', (chunk) => { data += chunk })
			.on('end', (res) => {
				let jsonProjects = JSON.parse(data);
				resolve(jsonProjects);
			})
			.on('error', (e) => {
			  Logger.error(`problem with request: ${e.message}`);
			  reject(e);
			});

	})
}

// Main function to poll the API and create projects
exports.getProjects = () => {
	getProjectsFromPlanGrid()
	.then(projects => iterateProjectlist(projects))
	.then(result => Logger.info(result))
	.catch(err => Logger.error(err))
}

// Create a single Project
exports.createProject = createProject;

// Poll the api
exports.getProjectsFromPlanGrid = getProjectsFromPlanGrid;