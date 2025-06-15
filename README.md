# AI Marketing Platform

This is a full-stack application that provides a suite of AI-powered marketing tools. The frontend is built with Next.js and the backend is a Node.js/Express server. It integrates with various AI services like OpenAI, Google Cloud AI, and Replicate, uses Supabase for the database, and Stripe for payments.

## Project Structure

The project is divided into two main parts:

-   `Frontend/`: The Next.js application that constitutes the user interface.
-   `Backend/`: The Node.js (Express) server that handles the application's logic, API requests, and integrations with third-party services.

The root directory also contains several `.sql` files for setting up and migrating the Supabase database.

## Features

-   **Ad Copy Generation:** Create compelling ad copy for your campaigns.
-   **Article Writer:** Generate full-length articles on any topic.
-   **Image Generator:** Create unique images from text prompts.
-   **Chat Assistant:** An AI-powered assistant to help with your marketing questions.
-   **User Authentication:** Secure user sign-up and login.
-   **Subscription Plans:** Different tiers of service with varying usage limits, managed via Stripe.

## Setup Instructions

### Prerequisites

-   Node.js (v14 or higher)
-   npm
-   Supabase Account & Project
-   OpenAI API Key
-   Stripe Account & API Keys

### 1. Backend Setup

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and add the following environment variables. You will need to get these from your Supabase, OpenAI, and Stripe dashboards.

    ```
    OPENAI_API_KEY=your_openai_api_key
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    PORT=3001 # Or another port of your choice
    NODE_ENV=development
    STRIPE_SECRET_KEY=your_stripe_secret_key
    ```

4.  Start the backend server:
    ```bash
    npm run dev
    ```

    The backend will be running on the port you specified (e.g., `http://localhost:3001`).

### 2. Frontend Setup

1.  In a new terminal, navigate to the `Frontend` directory:
    ```bash
    cd Frontend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file and add the following, pointing to your Supabase project and running backend:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
    ```
4.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will be running on `http://localhost:3000`.

### 3. Database Setup

The SQL files in the root of the project are used to set up and manage your Supabase database. You should run these in the Supabase SQL editor for your project.

-   `supabase_sql_setup.sql`: Initial database setup.
-   `create_rpc_function.sql`, `fix_image_generation_database.sql`, etc.: These files are for database migrations and updates. Apply them as needed to add new features or fix issues.

A typical initial setup would involve running `supabase_sql_setup.sql` first, and then other scripts to add specific functionality like the image generation tracking.

## Available Scripts

### Frontend

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a production server.
-   `npm run lint`: Lints the code.

### Backend

-   `npm run dev`: Starts the development server with `nodemon`.
-   `npm start`: Starts the production server.