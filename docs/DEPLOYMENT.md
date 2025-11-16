# Deployment Guide: AI Image Studio

This guide provides instructions for deploying the AI Image Studio application to two popular cloud platforms: Google Cloud Run and Vercel.

Our application has a unique "no-build-step" architecture. It relies on `importmap` to load libraries from a CDN and serves TypeScript (`.ts`, `.tsx`) files directly to the browser. This requires special configuration on the hosting platform to ensure files are served with the correct `Content-Type` header so the browser can execute them.

---

## ❗ Critical Note on API Key Security

**THIS IS THE MOST IMPORTANT SECTION OF THIS GUIDE.**

The application code in `services/geminiService.ts` currently calls the Gemini API directly from the browser using an API key from `process.env.API_KEY`.

**This will not work in a production deployment.**

Environment variables set in Cloud Run or Vercel are **server-side only**. They are not accessible in the user's browser. The `process.env` object is undefined in the browser unless you are using a build tool like Vite or Create React App to replace it during a build step, which this project does not have.

Exposing your Gemini API key directly in the browser is also a **major security risk**. Anyone could view your API key and use it, potentially leading to high costs.

### Recommended Solution (Secure)

The best practice is to create a simple backend proxy (e.g., a Cloud Function or a Vercel Serverless Function).
1.  The frontend (your React app) calls your own backend endpoint (e.g., `/api/generate`).
2.  Your backend endpoint, running securely on the server, receives the request.
3.  It then adds the Gemini API key (which it can safely access from server-side environment variables) and forwards the request to the real Gemini API.
4.  It returns the response from the Gemini API back to your frontend.

This way, your API key never leaves your server and is never exposed to the public.

**The following deployment guides will show you how to get the application's static files online and served correctly, but you will need to implement a backend proxy to handle the API calls securely and functionally.**

---

## Method 1: Deploying to Google Cloud Run

We will containerize the application using Docker and Nginx, a high-performance web server perfect for serving static files.

### Step 1: Create a `Dockerfile`

Create a new file named `Dockerfile` in the root of your project. This file tells Docker how to build an image of your application.

```dockerfile
# Dockerfile

# Use a lightweight Nginx image as our base
FROM nginx:1.25-alpine

# Nginx will look for configuration files in this directory.
# We remove the default one to replace it with our own.
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx configuration into the container.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all the application files (HTML, TSX, etc.) into the Nginx web root directory.
COPY . /usr/share/nginx/html

# Expose the port that Nginx will listen on (we define this in nginx.conf).
EXPOSE 8080

# The command to start Nginx when the container launches.
CMD ["nginx", "-g", "daemon off;"]
```

### Step 2: Create an `nginx.conf` File

Create a new file named `nginx.conf` in the root of your project. This configures Nginx to serve your single-page app and handle the special `.ts`/`.tsx` file types.

```nginx
# nginx.conf

# Define the server block
server {
    # Listen on port 8080, which is standard for Cloud Run containers.
    listen 8080;
    server_name localhost;

    # The root directory where our app files are located.
    root /usr/share/nginx/html;
    # The default file to serve.
    index index.html;

    # This is crucial for single-page applications (SPAs).
    # If a requested file isn't found, it falls back to serving /index.html.
    # This allows client-side routing to work correctly.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # This block is essential for our no-build-step setup.
    # It tells Nginx to serve .ts and .tsx files with the
    # 'application/javascript' MIME type. Without this, the browser
    # would not know how to execute these files.
    types {
        application/javascript ts tsx;
    }
}
```

### Step 3: Build and Push the Docker Image

1.  **Install Tools**: Make sure you have the [`gcloud` CLI](https://cloud.google.com/sdk/docs/install) and [Docker](https://www.docker.com/products/docker-desktop/) installed.
2.  **Authenticate**: `gcloud auth login` and `gcloud auth configure-docker`.
3.  **Set Project**: `gcloud config set project YOUR_PROJECT_ID`.
4.  **Enable Services**: `gcloud services enable run.googleapis.com artifactregistry.googleapis.com`.
5.  **Create Registry**: `gcloud artifacts repositories create my-app-repo --repository-format=docker --location=us-central1` (replace `us-central1` with your preferred region).
6.  **Build the Image**: `docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/my-app-repo/ai-image-studio:latest .`
7.  **Push the Image**: `docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/my-app-repo/ai-image-studio:latest`

### Step 4: Deploy to Cloud Run

Deploy the container you just pushed using the following command:

```sh
gcloud run deploy ai-image-studio \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/my-app-repo/ai-image-studio:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Cloud Run will provide you with a URL where your application is now live.

---

## Method 2: Deploying to Vercel via GitHub

Vercel is an excellent platform for deploying frontend applications. We just need to add one configuration file to make it work with our project structure.

### Step 1: Push Code to a GitHub Repository

1.  Create a new repository on [GitHub](https://github.com/new).
2.  Follow the instructions on GitHub to push your local project files to the new repository.

### Step 2: Create a `vercel.json` File

Vercel uses a `vercel.json` file for advanced configuration. Create this file in the root of your project. This configuration is essential for two things:
1.  Serving `.ts` and `.tsx` files with the correct `Content-Type` header.
2.  Setting up rewrites so your single-page application routing works correctly.

```json
{
  "headers": [
    {
      "source": "/(.*)\\.ts",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        }
      ]
    },
    {
      "source": "/(.*)\\.tsx",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api/|.*\\.).*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit and push this new file to your GitHub repository.

### Step 3: Import and Deploy on Vercel

1.  Sign up for a [Vercel](https://vercel.com) account and connect it to your GitHub account.
2.  From your Vercel dashboard, click "Add New... > Project".
3.  Find your GitHub repository and click "Import".
4.  In the "Configure Project" screen, Vercel will ask for a **Framework Preset**. Select **"Other"**.
5.  There is no build step, so you can leave the **Build and Output Settings** section with its default values (or toggle the "Override" switch and leave the build command blank). The **Root Directory** should be the root of your project.
6.  Click **"Deploy"**.

Vercel will deploy your site and provide you with a URL. It's that simple!
