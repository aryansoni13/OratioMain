# Hosting Oratio on Render - Step-by-Step Guide

Your project is now prepared for deployment on Render using a Blueprint (`render.yaml`). This approach automates the setup of both the frontend and backend.

## 1. Prerequisites
- A **GitHub** account.
- A **Render** account (connected to your GitHub).
- A **MongoDB Atlas** account (free tier).
- A **Google Gemini API Key**.

## 2. Setup Database (MongoDB Atlas)
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster (Shared Cluster - Free).
3. Under **Network Access**, add IP address `0.0.0.0/0` (Allow access from anywhere).
4. Under **Database Access**, create a user with a password.
5. Click **Connect** -> **Connect your application** and copy the **Connection String**.
   - Example: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

## 3. Push to GitHub
1. Create a new **private** repository on GitHub named `Oratio`.
2. Open a terminal in your project root (`c:\Users\DELL\Documents\Oratio\Oratio`).
3. Run the following commands:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git remote add origin https://github.com/<your-username>/Oratio.git
   git push -u origin main
   ```

## 4. Deploy to Render
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file and show the services:
   - `oratio-backend` (Docker)
   - `oratio-frontend` (Static Site)
5. **Fill in the Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `GOOGLE_API_KEY`: Your Gemini API key.
6. Click **Apply**.

## 5. Important Notes
- **Deployment Time**: The first deployment of the backend will take **5-10 minutes** because it has to download and build the Docker image with heavy ML libraries and models.
- **Instance Type**: Render's free tier has limited RAM. If the backend fails to build or crashes during analysis, you may need to upgrade to a "Starter" or "Pro" instance (especially for the 8GB+ RAM required by some ML models).
- **Hard Refresh**: After deployment, if you see errors, try a hard refresh (Ctrl+F5) in your browser.

## 6. Accessing your App
Once the services are "Live":
- Your frontend will be available at: `https://oratio-frontend.onrender.com`
- Your backend will be available at: `https://oratio-backend.onrender.com`
