const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    file_upload: {
        type: String, // Store as data URL
        default: null
    },
    image_upload: {
        type: String, // Store as data URL
        default: null
    },
    department: {
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true 
    },
    datetime: {
        type: Date, // Optional: if you want to store the submission date and time
        default: Date.now
    },
    schedule: { type: String, default: null},
    userId:String,
    ProjectId:String,
});

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
