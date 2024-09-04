const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    taskName: { type: String, required: true },
    taskdepartment: { type: String, required: true },
    taskDescription: { type: String, required: true },
    taskStartTime: { type: Date, required: true },
    taskEndTime: { type: Date, required: true },
    ProjectUploadId:String,
    ProjectUploaderID:String,
    scheduleUserId:String,
    ProjectDepartmentEmail:String
}, { timestamps: true });

const Task = mongoose.model('SchdeuleTask', taskSchema);

module.exports = Task;
