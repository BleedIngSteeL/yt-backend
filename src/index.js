// require('dotenv').config({path:'./env'})

import dotenv from "dotenv"

import mongoose from "mongoose";
import connectDB from "./db/index.js";
import app from "./app.js";

// dotenv ko require se import banate h aise 
dotenv.config({
    path: '../.env'
})
//console.log(dotenv.config());
// console.log("mongodb url : ", process.env.MONGODB_URL);


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGODB connection failed",err)
})