const mongoose = require("mongoose");
require("dotenv").config();
const mongo_url = process.env.MONGO_CONN;
// console.log("MongoDB Connection URL:", mongodb+srv://satendrakaushik2002:KRn7NUIYkUva9IQ7@govsync.odt1h.mongodb.net/?retryWrites=true&w=majority&appName=GovSync);
mongoose.connect(mongo_url)
    .then(() => {
        console.log("MongoDB Connected...");
    }).catch((err) => {
        console.error("MongoDB Connection error:", err);
    });