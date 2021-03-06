const expect = require('chai').expect;
const Bluebird = require('bluebird');

describe('models/issue', function () {
  before(function () {
    return require('../../models').sequelize.sync();
  });

  beforeEach(function () {
    this.Issue = require('../../models').Issue;
    this.Project = require('../../models').Project;
  });

  after(function () {
    this.Project = require('../../models').Project;
    return Bluebird.all([this.Project.destroy({ truncate: true })]);
  });

  afterEach(function () {
    this.Issue = require('../../models').Issue;
    return Bluebird.all([this.Issue.destroy({ truncate: true })]);
  });

  describe('create an Issue from the Model', function () {
    it('creates an issue', function () {
      
      // Generate random id
      function randomString(length) {
        return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
      }

      let project_uid = randomString(36);
      let project_name = 'A1111 Test Project for Issues';
      let project_id = project_name.substring(0,5);
      let issue_uid = randomString(36);

      return this.Project.create({ 
        uid: project_uid,  
        project_name: project_name,
        project_id: project_id
      }).bind(this).then(function (project) {
        return this.Issue.create({ 
          uid: issue_uid, 
          project_uid: project.uid,
          title: 'There is an issue'
        }).then(function (issue) {
          expect(issue.title).to.equal('There is an issue');
          expect(issue.project_uid).to.equal(project.uid);
        });
      });
    });
  });
});