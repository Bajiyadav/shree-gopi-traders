import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  const filePath = '/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485031288.png';
  console.log('Uploading image to Cloudinary:', filePath);
  
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'shree-gopi-traders/products',
    public_id: 'mdm-herbal-my-saffron-beauty-soap-150g',
    overwrite: true,
  });

  console.log('Uploaded successfully!');
  console.log('Secure URL:', result.secure_url);
}

run().catch(console.error);
