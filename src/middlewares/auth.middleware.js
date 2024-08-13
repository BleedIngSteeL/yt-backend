import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";



export const verifyJWT = asyncHandler(async(req,res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer ","");
        if(!token){
            throw new ApiError(401,"Unauthorized access");
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if(!user){
            throw new ApiError(401,"Invalid access token");
        }
    
        // this  attaches the authenticated user object to the request object (req). This allows subsequent middleware functions and route handlers to access the user information without needing to re-verify the token or re-fetch the user details from the database.
        //This is especially useful for authorization, as the user object can contain roles or permissions that determine what actions the user is allowed to perform.
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token...");
    }
})