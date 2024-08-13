import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // db me  save 
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}
    } 
    catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, username, password } = req.body;

  //validation - not empty
  if (fullName.trim() === "" || !fullName)
    throw new ApiError("Name is required", 400);
  if (email.trim() === "" || !email)
    throw new ApiError("Email is required", 400);
  if (username.trim() === "" || !username)
    throw new ApiError("Username is required", 400);
  if (password.trim() === "" || !password)
    throw new ApiError("Password is required", 400);

  // check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError("Email already exists", 409);
  }

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new ApiError("Username already exists", 409);
  }
  //check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;
  }


//   console.log("avatar ",avatarLocalPath);
//   console.log("cover",coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError("Avatar is required", 400);
  }

  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError("Avatar upload failed", 500);
  }

  // craete user object, create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  // remove pswd and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError("User creation failed", 500);
  }

  // return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user created successfully"));
});

const loginUser = asyncHandler(async (req, res) =>{
    // req body se data nikalo 
    const { email,username, password } = req.body;

    // check if email or username is empty
    if(!(email || username)){
        throw new ApiError(400,"email or username is required");
    }

    // usename and email
    // find the user 
    const user = await User.findOne({ 
        $or: [{ email }, { username }] 
    });

    if(!user){
        throw new ApiError(404,"user not found");
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"invalid password");
    }

    // access and refresh token
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

    // send cookie
    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    // sending response 
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "user logged in successfully"
    ));
})

const logoutUser = asyncHandler(async (req,res) =>{
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set:{
          refreshToken: undefined
        }
      },
      {
        new: true
      }
    )

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out successfully..."))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id);
    if(!user){
      throw new ApiError(401,"invalid refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401,"refresh token is expired or used")
    }
  
    const options ={
      httpOnly: true,
      secure: true
    }
  
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
      new ApiResponse(
        200,
        { accessToken,refreshToken : newRefreshToken },
        "access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }

})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
  const {oldPassword,newPassword,confirmNewPassword} = req.body;

  if(!(newPassword === confirmNewPassword)){
    throw new ApiError(400,"passwords do not match")
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect){
    throw new ApiError(400,"old password is incorrect")
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200,{}, "password changed successfully"));

})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"user fetched successfully..."))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullName,email} = req.body;
  if(!fullName || !email){
    throw new ApiError(400,"all fields are required")
  }

  const user = User.findByIdAndDelete(
    req.user?._id,
    {
      $set : {
        fullName,
        email
      }
    },
    {
      new : true // isse updated user return v ho jaata hai usiliye user me store v kr rhe h isko
    }
  )
  .select("-password") 

  return res
  .status(200)
  .json(new ApiResponse(200,user,"account details updted successfully..."))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"avatar file is missing...")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new ApiError(400,"error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      avatar : avatar.url
    },
    {
      new:true
    }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"avatar updated successfully..."))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400,"Cover Image file is missing...")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage.url){
    throw new ApiError(400,"error while uploading on coverImage")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      coverImage : coverImage.url
    },
    {
      new:true
    }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"coverImage updated successfully..."))
})




export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
 };
