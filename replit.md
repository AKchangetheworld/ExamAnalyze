# Exam Paper Analysis Web App

## Overview

This is an AI-powered exam paper analysis web application that allows users to upload exam paper images, processes them using OCR technology, and provides detailed analysis and feedback using Google's Gemini AI. The application features a modern React frontend with a Node.js/Express backend, designed with a mobile-first approach using Shadcn UI components.

The system follows a multi-step processing workflow: upload → OCR recognition → AI analysis → results presentation. Users can upload exam paper images through a drag-and-drop interface, track processing progress through visual indicators, and receive comprehensive feedback including scores, grades, and detailed improvement suggestions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Upload**: Multer middleware for handling multipart form data
- **Storage Interface**: Abstracted storage layer with in-memory implementation
- **API Design**: RESTful endpoints with structured error handling

### Data Layer
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon Database serverless connection
- **Models**: Users and ExamPapers with relational structure

### Processing Pipeline
- **OCR Processing**: Google Gemini AI for text extraction from images
- **Analysis Engine**: Google Gemini AI for intelligent exam evaluation
- **File Storage**: Local filesystem storage with configurable upload limits
- **Progress Tracking**: Real-time status updates through processing steps

### Design System
- **Approach**: Mobile-first responsive design
- **Theme**: Light/dark mode support with CSS custom properties
- **Typography**: Inter font family with semantic weight system
- **Color Palette**: Neutral grays with accent colors for different states
- **Components**: Consistent spacing using Tailwind's 4-point grid system

### Authentication & Authorization
- Currently implements basic user model structure
- Session management prepared but not fully implemented
- Designed for future extension with proper auth flows

### Error Handling & Logging
- Centralized error handling middleware
- Request/response logging with performance metrics
- Structured error responses with appropriate HTTP status codes

## External Dependencies

### AI & ML Services
- **Google Gemini AI**: Primary AI service for OCR and analysis using @google/genai SDK
- **Model**: Gemini-2.5-flash for text extraction and intelligent evaluation

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations and schema management
- **File System**: Local storage for uploaded exam paper images

### UI & Styling
- **Radix UI**: Comprehensive component primitives library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Icon library for consistent visual elements
- **Vaul**: Drawer component for mobile interactions

### Development & Build
- **Vite**: Frontend build tool with HMR and TypeScript support
- **ESBuild**: Backend bundling for production deployment
- **PostCSS**: CSS processing with Autoprefixer
- **TypeScript**: Static type checking across frontend and backend

### Utility Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Date-fns**: Date manipulation utilities
- **Wouter**: Lightweight routing library
- **Zod**: Runtime type validation and schema definition