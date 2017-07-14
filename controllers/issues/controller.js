const models  = require('../../models');
const request = require('request');
const PG_config = require('../../config/config');
const moment = require('moment');
const tz = require('moment-timezone');
const Logger = require('../../config/logger');

const RATE_LIMIT = 2000;

// create new issue  -- overwrite old by default
function createIssue(project, issue) {

	let now = moment();
	now.tz('America/Los_Angeles').format();

	// convert to string
	let title = issue.title;
	let strTitle = title.toString();
	let description = issue.description;
	let strDescription = description.toString();

	return models.Issue
		.find({ where: { uid: issue.uid }})
		.then((found) => {
			
			// Check if Issue is assigned to anyone
			let assigned_to = (issue.assigned_to != null ? issue.assigned_to[0].email : null);

			// Issue not found so need to create
			if (!found) {
				return models.Issue
					.create({
						uid: issue.uid,
						project_uid: project,
						number: issue.number,
						title: strTitle,
						room: issue.room,
						description: strDescription.substring(0, 1000),
						assigned_to: assigned_to,
						stamp: issue.current_annotation.stamp,
						color: issue.current_annotation.color,
						created_by: issue.created_by.email,
						status: issue.status,
						due_at: issue.due_at,
						created_at: issue.created_at,
						updated_at: issue.updated_at,
						updatedAt: now,
						createdAt: now
					})
					.then((issue) => issue)
					.catch((err) => {
						Logger.error(err);
						Logger.close();
						return err;
					});
			} else {
			
			// Issue found so need to update
				return models.Issue
					.update({
						number: issue.number,
						title: strTitle,
						room: issue.room,
						description: strDescription.substring(0, 1000),
						assigned_to: assigned_to,
						stamp: issue.current_annotation.stamp,
						color: issue.current_annotation.color,
						created_by: issue.created_by.email,
						status: issue.status,
						due_at: issue.due_at,
						created_at: issue.created_at,
						updated_at: issue.updated_at,
						updatedAt: now,
					},
					{ where: { uid: issue.uid }})
					.then((issue) => issue)
					.catch((err) => {
						Logger.error(err);
						Logger.close();
						return err;
					});
			}
		})
}

// iterate over list of issues
const iterateIssueList = (project_uid, issues, count) => {
	let data = issues.data;

	// filter out deleted issues
	data.filter(issue => { return data.deleted != true })
		.forEach(issue => createIssue(project_uid, issue));

	// make additional batch requests if issues.total_count > count
	if (issues.total_count > count){
		let batch = [];
		let calls = Math.ceil(issues.total_count / 50);

		for (let i = count / 50; i < calls; i ++){
			batch.push({
				"method": "GET",
				"path": "/projects/" + project_uid + "/issues?skip=" + (i * 50)
			})
		}

		setTimeout( () => {
			getIssues( [project_uid], calls * 50, batch );
		}, RATE_LIMIT);
	}
}

// get issues with a 1 second delay
const getIssues = (batch, count, requests) => {
	return new Promise((resolve, reject) => {
		// create requests object if one is not passed
		// only the first call doesn't contain a requests object
		if (!requests){
			requests = []
			batch.forEach(projectId => {
				requests.push({
					"method": "GET",
					"path": "/projects/" + projectId + '/issues'
				});
			});
		}

		let options = {
			url: 'https://' + PG_config.plangrid.url + '/batch',
			auth: { 'user': PG_config.plangrid.key },
			method: 'POST',
			headers: PG_config.plangrid.headers,
			json: requests
		}

		let data = '';
		request(options)
			.on('data', (chunk)  => { data += chunk })
			.on('end', (res) => {
				let responseData = JSON.parse(data);

				// let's resolve each response from the batch
				responseData.data.forEach( (response, index) => {
					let projectUid = batch[index];
					let body = JSON.parse(response.body);

					if (response.status_code === 200 && body.total_count > 0) {
						iterateIssueList(projectUid, body, count || 50);
						resolve();
					} else {
						resolve(projectUid, body)
					}

				})
			})
			.on('error', (e) => {
				Logger.error(e.message);
				Logger.close();
				reject(e);
			});
	})
}

// iterate over projects to get a list of all associated issues
const iterateProjectsList = (projectIds) => {
	let requests = Math.ceil(projectIds.length / 50); // number of batch requests to make depending on number of projects

	// split requests into 50 request a time
	let batches = [];
	for(let i = 0; i < requests; i++){
		batches[i] = projectIds.slice(i * 50, (i * 50) + 50);
	}

	const issuePromises = batches.map(batch => new Promise( (resolve, reject) => {
		setTimeout( () => {
			resolve (getIssues(batch));
		}, RATE_LIMIT);
	}));

	return Promise.all(issuePromises);
}

// get a list of all the projects and return their uid
const getProjectIds = () => models.Project.findAll()
	.then(projects => projects.map(p => p.dataValues.uid));

// Main function to get all the issues
exports.getAllIssues = () => {
	getProjectIds()
		.then(projectIds => iterateProjectsList(projectIds))
		.then(issues => { Logger.log(issues);})
		.catch((err) => {
			Logger.error(err);
			Logger.close();
			return err;
		});
}