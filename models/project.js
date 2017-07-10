"use strict";

module.exports = function(sequelize, DataTypes) {
  var Project = sequelize.define("Project", {
    uid: {
      primaryKey: true,
      type: DataTypes.STRING,
      allowNull: false
    },
    project_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    project_id: {
      type: DataTypes.STRING
    },
    custom_id: DataTypes.STRING,
    type: DataTypes.STRING,
    status: DataTypes.STRING,
    owner: DataTypes.STRING,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    street_1: DataTypes.STRING,
    street_2: DataTypes.STRING,
    city: DataTypes.STRING,
    region: DataTypes.STRING,
    postal_code: DataTypes.STRING,
    country: DataTypes.STRING,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    classMethods: {
      associate: function(models) {
        Project.hasMany(models.Issue, {
          foreignKey: {
            allowNull: false,
            name: 'uid'
          },
          constraints: false
        }),
        Project.hasMany(models.RFI, {
          foreignKey: {
            allowNull: false,
            name: 'uid'
          },
          constraints: false
        });
      }
    }
  });

  return Project;
};
