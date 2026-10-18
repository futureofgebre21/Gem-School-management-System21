# Gem School Management System (GemSIS) 🎓

Welcome to the official repository for **GemSIS**, a modern, scalable, and comprehensive School Management System designed to streamline school administration, student tracking, and teacher management.

## 🌍 Live Project


## 🚀 Technologies Used

This project is built with a modern tech stack to ensure high performance, security, and scalability:

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL, Authentication, Row Level Security)
- **Deployment**: Vercel

## 💻 Local Development Setup

If you want to clone this repository and run the project locally using your preferred IDE, follow these steps.

### Prerequisites
Make sure you have Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation Steps

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd gemschool-management

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Set up your environment variables. 
# Create a .env file in the root directory and add your Supabase keys:
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Step 5: Start the development server with auto-reloading.
npm run dev
