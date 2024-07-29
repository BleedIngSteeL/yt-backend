import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })

        // fs.unlinkSync(localFilePath);
        return response;
    } 
    catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export { uploadOnCloudinary };


// user se frontenfd se image ya file leke pehle local storage pe rkhte hai, uske baad local storage se cloudinary pe dalte hai, aur cloudinary response me url bhejta h ek. malicious data pada reh jaega local storage pe isiliye fs module ka unlink ko synchronously use krke local storage se fs ka link todd denge .
// matlab wo file toh ab v rhega local storage me prr uska link toot jaega fs se , toh wo fs ke liye abb exist hi nahi krega 