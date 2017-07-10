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
			custom_id: project.custom_id,
			type: project.type,
			status: project.status,
			owner: project.owner,
			start_date: project.start_date,
			end_date: project.end_date,
			street_1: project.street_1,
			street_2: project.street_2,
			city: project.city,
			region: project.region,
			postal_code: project.postal_code,
			country: project.country,
			updatedAt: now
		},
	})
	.spread((project, created) => {
		return project;
	})
}

// iterator over list
const iterateProjectlist = (result) => {

	result.projects.data.forEach(response => {
		if (response.status_code === 200){
			let body = JSON.parse(response.body);
			body.data.forEach(project => createProject(project));
		}
	})

	// make batch call if total count > number count
	let first = result.projects.data[0];
	let totalCount = JSON.parse(first.body).total_count;
	if (result.count < totalCount){
		let batch = [];
		let calls = Math.ceil(totalCount / 50);

		for(let count = result.count / 50; count < calls; count++){
			batch.push({
				"method": "GET",
				"path": "/projects?skip=" + (count * 50)
			})
		}

		setTimeout(function(){
			getProjects(batch, calls * 50);
		}, 1000)
	}

}

// get projects
const getProjectsFromPlanGrid = (requests, count) => {

	return new Promise((resolve, reject) => {
		let batchRequest = requests || [{"method": "GET", "path": "/projects"}]
		let options = {
			url: 'https://' + PG_config.plangrid.url + '/batch',
			auth: { 'user' : PG_config.plangrid.key },
			method: 'POST',
			headers: PG_config.plangrid.headers,
			json: batchRequest
		}

		let data = '';
		request(options)
			.on('data', (chunk) => { data += chunk })
			.on('end', (res) => {
				let jsonProjects = JSON.parse(data);
				resolve({"projects": jsonProjects, "count": count || 50});
			})
			.on('error', (e) => {
			  Logger.error(`problem with request: ${e.message}`);
			  reject(e);
			})

	})
}

// Main function to poll the API and create projects
const getProjects = (requests, count) => {
	getProjectsFromPlanGrid(requests, count)
	.then(result => iterateProjectlist(result))
	.then(result => Logger.info(result))
	.catch(err => Logger.error(err))
}
exports.getProjects = getProjects;

// Create a single Project
exports.createProject = createProject;

// Poll the api
exports.getProjectsFromPlanGrid = getProjectsFromPlanGrid;