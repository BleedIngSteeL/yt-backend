// require('dotenv').config({path:'./env'})

import dotenv from "dotenv"

import mongoose from "mongoose";
import connectDB from "./db/index.js";

// dotenv ko require se import banate h aise 
dotenv.config({
    path: './env'
})

connectDB();