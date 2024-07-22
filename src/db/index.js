import mongoose from "mongoose";
// import {DB_NAME} from "../constants.js"

const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`mongodb+srv://aman:aman123@ytbackend.vnnetb5.mongodb.net/`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } 
    catch (error) {
        console.log("Mongodb connection failed",error);
        process.exit(1);
    }
}

export default connectDB;
