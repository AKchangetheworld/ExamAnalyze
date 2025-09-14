# Overview

This is an AI-powered exam paper analysis web application that allows users to upload exam paper images, automatically extract text using OCR technology, and receive detailed AI-driven feedback and scoring. The application is built with a modern full-stack architecture using React for the frontend, Express.js for the backend, and integrates with DeepSeek AI for intelligent analysis capabilities.

The application provides a mobile-first user experience with a clean, intuitive interface for uploading exam papers, tracking processing progress, and viewing comprehensive analysis results including scores, feedback, and improvement suggestions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with **React 18** using modern hooks and functional components, with the following key architectural decisions:

- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state management and API caching
- **UI Framework**: shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with a comprehensive design system supporting light/dark themes
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

The architecture follows a component-based approach with clear separation between UI components, business logic, and API interactions. The design system includes custom color palettes, typography scales, and responsive components optimized for mobile-first usage.

## Backend Architecture

The backend uses **Express.js** with TypeScript and follows a RESTful API design:

- **Server Framework**: Express.js with TypeScript for type safety
- **File Upload**: Multer middleware for handling image file uploads
- **Image Processing**: Sharp for image optimization and format conversion
- **API Structure**: RESTful endpoints for file upload, processing, and status tracking
- **Error Handling**: Centralized error handling with proper HTTP status codes

The server architecture separates concerns between route handlers, business logic services, and storage abstractions, making it easy to extend and maintain.

## Data Storage Solutions

The application implements a flexible storage abstraction layer:

- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless database service
- **Schema Design**: Separate tables for users and exam papers with proper relationships
- **Development Storage**: In-memory storage implementation for development/testing
- **Migration System**: Drizzle Kit for database schema migrations

The storage layer uses an interface-based approach, allowing easy switching between different storage implementations (in-memory for development, PostgreSQL for production).

## Authentication and Authorization

The application includes user management infrastructure:

- **User Schema**: Username/password based authentication system
- **Session Management**: Express sessions with PostgreSQL session store
- **Password Security**: Secure password handling patterns ready for implementation

The authentication system is designed to be extensible and secure, with proper separation between user management and application logic.

## AI Integration Architecture

The core AI functionality is powered by **DeepSeek AI** services:

- **OCR Service**: Vision-capable AI model for extracting text from exam paper images
- **Analysis Engine**: Advanced reasoning model for comprehensive exam analysis
- **API Integration**: OpenAI-compatible interface for seamless AI service integration
- **Processing Pipeline**: Multi-step workflow (upload → OCR → analysis → results)

The AI integration is designed with error handling, retry mechanisms, and proper response validation to ensure reliable processing of exam papers.

# External Dependencies

## AI Services
- **DeepSeek AI**: Primary AI service for OCR text extraction and intelligent exam analysis
- **OpenAI SDK**: Used for API communication with DeepSeek's OpenAI-compatible interface

## Database Services
- **Neon Database**: Serverless PostgreSQL database for production data storage
- **connect-pg-simple**: PostgreSQL session store for user session management

## Image Processing
- **Sharp**: High-performance image processing for optimization and format conversion
- **Multer**: Express middleware for handling multipart/form-data file uploads

## UI and Styling
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Modern build tool with HMR and optimized bundling
- **TypeScript**: Type safety across the entire application
- **Zod**: Runtime type validation and schema definition
- **React Query**: Server state management and caching solution

## Additional Services
- **Google Fonts**: Web fonts (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Replit Integration**: Development environment integration and runtime error handling

The application is designed to be easily deployable and scalable, with clear separation between development and production configurations.