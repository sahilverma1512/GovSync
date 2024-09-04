const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require('dotenv').config();
const session = require("express-session");
const MongoStore = require("connect-mongo");
const Project = require('./models/UploadProject');
const DepartmentRegister = require("./models/DepartmentRegister");
require('./db/conn');
const http = require('http');
const app = express();
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 4001;
const staticPath = path.join(__dirname, "../public");
const task=require("./models/ScheduleTask");
const axios = require('axios');
const UserLogin=require("./models/OfficerRegister");
// Middleware for sessions
app.use(session({
    secret: process.env.SESSION_SECRET || '123456',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_CONN,  // Your MongoDB connection string
        collectionName: 'sessions',
        ttl: 12 * 60 * 60  // Time to live in seconds (12 hours)
    }),
    cookie: {
        maxAge: 12 * 60 * 60 * 1000  // 12 hours in milliseconds
    }
}));

app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: true, limit: '50mb' })); 
app.use(express.json({ limit: '50mb' })); 

app.use(express.static(staticPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Serve the HTML form
app.get("/", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
});

// Route to handle form submission
app.post("/submitForm", (req, res) => {
    const { name, start_date, end_date, email, phone_number, address, city, region, uploadPath, imageInput, datetime, description,ProjectId } = req.body;
    
    if (!name || !start_date || !end_date || !email || !phone_number || !address || !city || !region || !description) {
        return res.status(400).send('All fields are required.');
    }
  
    const userId=req.session.DepartmentuserId;
//  console.log(`User ID ${req.session.DepartmentuserId} stored in session`);
    const newProject = new Project({
        name,
        start_date,
        end_date,
        email,
        phone_number,
        address,
        city,
        region,
        file_upload: uploadPath || null,
        image_upload: imageInput || null,
        department:req.session.RegisterDepartment,
        description,
        datetime,
        userId,
        ProjectId,
    });
    // public\Departement\DeapartmentProjectUpload.html
    newProject.save()
    .then(() => res.sendFile(
        path.join(staticPath, "../public/Departement/DeapartmentProjectUpload.html")
    ))
    .catch(err => res.status(400).send('Error: ' + err.message));
});


io.on("connection", (socket) => {
    socket.on("userMessage", (message) => {
        io.emit("message", message);
    });
});

app.get("/projects", async (req, res) => {
    try {
       const projects=await Project.find({});
        // const cityDepartment=req.session.district;
        // const projects = await Project.find({ cityDepartment: district });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

app.get("/projects/:id", async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        req.session.ProjectId=project.ProjectId;
        console.log(project.ProjectId)
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch project details" });
    }
});

// DepartmentRegister
app.post('/DepartmentRegister', async (req, res) => {
    try {
        const { Email, Phone, Address, district, department, State, country, PinCode, password, C_password, uniqueId } = req.body;

        if (password !== C_password) {
            return res.status(400).send('Passwords do not match');
        }

        const existingUser = await DepartmentRegister.findOne({ Email });
        if (existingUser) {
            return res.status(400).send('User with this email already exists');
        }

        const newDepartmentRegister = new DepartmentRegister({ Email, Phone, Address, district, department, State, country, PinCode, password, C_password, uniqueId });
        const savedUser = await newDepartmentRegister.save();

        // Store the userId in session
  
        req.session.DepartmentuserId = newDepartmentRegister.uniqueId;
        req.session.DepartmentEmail=newDepartmentRegister.Email;
        req.session.RegisterDepartment=newDepartmentRegister.department;
        console.log(newDepartmentRegister.uniqueId);
        res.sendFile(path.join(__dirname, "../public/Departement/DepartmentIndex.html"));
    } catch (error) {
        console.error(error);
        res.sendFile(path.join(__dirname, "../public/Departement/DepartmentRegister.html"));
    }
});

// DepartmentLogin
app.post("/DepartmentLogin", async (req, res) => {
    try {
        const { Email, password } = req.body;
        const user = await DepartmentRegister.findOne({ Email });

        if (!user || user.password !== password) {
            return res.status(401).send('<script>alert("Invalid username or password!!"); window.location.href = "/";</script>');
        }

        // Store the userId in session
        req.session.DepartmentuserId = user.uniqueId;
        req.session.DepartmentEmail=user.Email;
        req.session.RegisterDepartment=user.department;
       

        res.sendFile(path.join(__dirname, "../public/Departement/DepartmentIndex.html"));
    } catch (error) {
        console.error(error);
        res.sendFile(path.join(__dirname, "../public/Departement/DepartmentLogin.html"));
    }
});








app.post('/scheduleTask', (req, res) => {
    const { taskName,taskDescription, taskStartTime, taskEndTime, ProjectUploadId,ProjectUploaderID} = req.body;
    console.log("Routes"+ProjectUploadId);
    const scheduleUserId=req.session.DepartmentuserId;
    const taskdepartment=req.session.RegisterDepartment;
    const ProjectDepartmentEmail=req.session.DepartmentEmail;
    // scheduleUserId
    try {
        const newTask = new task({
            taskName,
            taskDescription,
            taskdepartment,
            taskStartTime: new Date(taskStartTime),
            taskEndTime: new Date(taskEndTime),
            ProjectUploaderID,
            ProjectUploadId,
            scheduleUserId,
            ProjectDepartmentEmail
        });

        newTask.save()
            .then(() => {
                res.json({ message: 'Task scheduled successfully!' });
            })
            .catch(error => {
                console.error('Error saving task:', error);
                res.status(500).json({ message: 'Failed to schedule task' });
            });
    } catch (error) {
        console.error('Error saving task:', error);
        res.status(500).json({ message: 'Failed to schedule task' });
    }
});









//step1:
app.get("/SchedulingData", async (req, res) => {
    try {
        // Find all tasks for the current department user
        const ProjectUploaderID = req.session.DepartmentuserId;
        const scheduledTasks = await task.find({ ProjectUploaderID });

        if (scheduledTasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found' });
        }

        // Collect all project IDs from the tasks
        const projectIds = scheduledTasks.map(t => t.ProjectUploadId);

        // Find all projects where the ProjectId matches and the schedule is null or empty
        const matchedProjects = await Project.find({
            ProjectId: { $in: projectIds },
            $or: [{ schedule: null }, { schedule: "" }]
        });

        if (matchedProjects.length === 0) {
            return res.status(404).json({ message: 'No matching projects found' });
        }

        // Map the tasks and projects together
        const result = scheduledTasks.map(t => {
            const matchedProject = matchedProjects.find(p => p.ProjectId === t.ProjectUploadId);
            if (matchedProject) {
                return {
                    task: t,
                    project: matchedProject
                };
            }
        }).filter(Boolean);  // Filter out undefined results

        // Send the result as JSON
        res.json({ matchedData: result });
    } catch (err) {
        console.error('Error fetching matching projects:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Step2:
app.put('/updateProject/:id', async (req, res) => {
    const projectId = req.params.id;
    const { end_date,start_date,department, schedule } = req.body;

    if (!end_date) {
        return res.status(400).send('End date is required.');
    }

    try {
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { end_date, start_date,department,schedule },
            { new: true }  // Return the updated document
        );

        if (!updatedProject) {
            return res.status(404).send('Project not found.');
        }

        res.json({ success: true, project: updatedProject });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).send('Failed to update project.');
    }
});












// step3:


app.get('/WorkfetchTasks', (req, res) => {
    // Assuming you store ProjectId in session and match the project data
    Project.find({})
        .then(matchedData => {
            res.json({ matchedData });
        })
        .catch(error => {
            console.error('Error fetching tasks:', error);
            res.status(500).json({ error: 'Error fetching tasks' });
        });
});






// step4:


// Add this to your app.js
app.get("/getCityCoordinates", async (req, res) => {
    try {
        const cityName = req.query.city;
        const openCageApiKey = 'dbf5cac2f04c479c8c514f6567eedef3';
        const openCageUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(cityName)}&key=${openCageApiKey}`;

        const response = await axios.get(openCageUrl);
        const data = response.data;

        if (data.results && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry;
            res.json({ latitude: lat, longitude: lng });
        } else {
            res.status(404).json({ error: "City not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch coordinates" });
    }
});


// step5:
app.post("/OfficerRegistration", async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        PhoneNumber,
        dob,
        gender,
        address,
        city,
        region,
        department,
        pinCode,
        password,
        uniqueId,
      } = req.body;
      
      const newUser = new UserLogin({
        firstName,
        lastName,
        email,
        PhoneNumber,
        dob,
        gender,
        address,
        city,
        region,
        department,
        pinCode,
        password,
        uniqueId,
      });
      // Save the user to the database
      await newUser.save();
      // res.status(201).send("User registered successfully!");public\Officer\OfficerIndex.html
      res.sendFile(path.join(staticPath, "../public/Officer/OfficerIndex.html"));
      const City = newUser.district;
      req.session.city = City;
      req.session.department = newUser.department;
      req.session.OfficeruserId = newUser.uniqueId;
    } catch (error) {
      console.error("Error registering user:", error);
      // res.status(500).send('Error registering user');
      res.sendFile(
        path.join(__dirname, "../public/Officer/OfficerLogin.html")
      );
    }
  });
  //  LOGIN VALIDATION
  app.post("/OfficerLogin", async (req, res) => {
    try {
      const { email, password, captchaInput, captcha } = req.body;
      const user = await UserLogin.findOne({ email });
            if (!user || user.password !== password) {
        return res.send(
          '<script>alert("Invalid email or password"); window.location.href = "/";</script>'
        );
      } else if (captchaInput !== captcha) {
        return res.send(
          '<script>alert("Invalid captcha"); window.location.href = "/";</script>'
        );
      }
      console.log("hogaya");
      const region = user.region;
      req.session.department = user.department;
      req.session.OfficeruserId = user.uniqueId;
      req.session.userRegion = region;
      res.sendFile(path.join(staticPath, "../public/Officer/OfficerIndex.html"));
    } catch (error) {
      console.error(error);
      // return res.status(500).send('Internal Server Error');
      res.sendFile(
        path.join(__dirname, "../public/Officer/OfficerLogin.html")
      );
    }
  });














  const nodemailer = require('nodemailer');

  app.post('/sendemail', (req, res) => {
     const { name, email, message , msg} = req.body;
 
     // Create nodemailer transporter
     const transporter = nodemailer.createTransport({
         service: 'Gmail',
         auth: {
             user: 'vbabita872@gmail.com',
             pass: 'uuytqstyrldtotcj'
         }
     });
 
     // Setup email data
     const mailOptions = {
         from: 'vbabita872@gmail.com',
         to: email,
         subject: 'GovSync Update',
         text: `Name : ${name}\nEmail: ${email}\n ${message}`,
         html:`
         <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Task Completed</title>
     <style>
       body {
         font-family: 'Arial', sans-serif;
         background-color: #f4f4f4;
         margin: 0;
         padding: 0;
       }
       .container {
         width: 80%;
         margin: 20px auto;
         background: #ffffff;
         border-radius: 10px;
         box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
         overflow: hidden;
       }
       .header {
         background-color: #2596be;
         color: white;
         text-align: center;
         padding: 20px;
       }
       .header h1 {
         margin: 0;
         font-size: 2.5em;
       }
       .content {
         padding: 20px;
         text-align: center;
       }
       .content p {
         font-size: 1.2em;
         color: #333;
       }
       .content .celebrate {
         margin-top: 20px;
         font-size: 1.5em;
         color: #ff6f61;
         animation: celebration 1s infinite alternate;
       }
       @keyframes celebration {
         0% { transform: scale(1); }
         100% { transform: scale(1.1); }
       }
       .footer {
         background-color: #2596be;
         color: white;
         text-align: center;
         padding: 10px;
       }
     </style>
   </head>
   <body>
     <div class="container">
       <div class="header">
         <h1>GovSync</h1>
       </div>
       <div class="content">
         <p>Hello, ${name}</p>
         <p>${message}</p>
       </br>
         <p>If you have any further questions or need additional assistance, please do not hesitate to reach out.</p>
       </div>
       <div class="footer">
         <p>&copy; 2024 GovSync . All rights reserved.</p>
       </div>
     </div>
   </body>
   </html>`
     };
 
     // Send email
     transporter.sendMail(mailOptions, (error, info) => {
         if (error) {
             console.error('Error sending email:', error);
             res.status(500).send('Error sending email');
         } else {
             console.log('Email sent:', info.response);
             res.status(200).send('Email sent successfully');
      }
 });
 console.log("Email Sent Succesfull!!");
 });









// Start the server
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
