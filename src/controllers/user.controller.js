import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

export { registerUser };
