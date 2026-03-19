Full-Stack Coding Assignment – HRMS Lite
Overview
You are required to design and develop a lightweight Human Resource Management System (HRMS Lite).
This assignment is intended to evaluate your end-to-end full-stack development skills, including:
Frontend development
Backend API design
Database modeling & persistence
Error handling & validations
Deployment and production readiness
The scope is intentionally limited so that it can be completed within 6-8 hours.
The focus should be on delivering a clean, stable, and functional application, not on building excessive features.
Problem Statement
Build a web-based HRMS Lite application that allows an admin to:
Manage employee records
Track daily attendance
The system should simulate a basic internal HR tool, focusing on essential HR operations with a simple, usable, and professional interface.
Functional Requirements

1. Employee Management
The application should allow the admin to:
Add a new employee with the following details:
Employee ID (unique)
Full Name
Email Address
Department
View a list of all employees
Delete an employee

2. Attendance Management
The application should allow the admin to:
Mark attendance for an employee with:
Date
Status (Present / Absent)
View attendance records for each employee

Backend & Database Requirements
Implement RESTful APIs for all functionalities
Persist data using a database (SQL or NoSQL)
Perform basic server-side validation
Required fields
Valid email format
Duplicate employee handling
Handle invalid requests and errors gracefully
Proper HTTP status codes
Meaningful error messages

Constraints & Guidelines
Assume a single admin user (no authentication required)
Leave management, payroll, and advanced HR features are out of scope

Frontend UI should resemble a professional, production-ready website
Expectations for UI:
Clean layout
Proper spacing
Consistent typography
Intuitive navigation
Use reusable components

Show meaningful UI states:
Loading
Empty states
Error states
Code should be:
Readable
Modular
Well-structured

The application should be realistically usable, not just a demo

Bonus (Optional)
You may implement one or more of the following:
Filter attendance records by date
Display total present days per employee
Basic dashboard summary (counts or tables)
Bonus features will be considered only if the core functionality is complete and stable.


Tech Stack -
React
FastAPI
MongoDB

Deployment
Vercel / Netlify (Frontend)
Render / Railway /(Backend)
