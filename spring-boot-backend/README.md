# LockerBuddy Smart Locker & School Assistant — Local Setup Guide

## Architecture Overview
This project includes:
1. **Live Interactive Full-Stack Web App** (React + Tailwind CSS + Chart.js + Lottie + Web Speech API + Gemini AI / TTS / Study Poster Studio served by Express on port `3000`).
2. **Java 17 / Spring Boot 3 Backend** inside `spring-boot-backend/` (`Spring Web`, `Spring Data JPA`, `H2 Database`, `Lombok`, `CommandLineRunner` seed data).

## Option A: Run the Java 17 + Spring Boot 3 Backend Locally
### Prerequisites
- Java 17+ (`java -version`)
- Maven 3.9+ (`mvn -version`)

### Steps
1. Open a terminal and navigate to the Spring Boot backend folder:
   ```bash
   cd spring-boot-backend
   ```
2. Build and start the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
3. Verify the REST API and H2 Database Console:
   - API Base URL: `http://localhost:8080/api`
   - H2 Database Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:schoolassistantdb`, User: `sa`, Password: empty)
   - Sample Endpoints:
     - `GET http://localhost:8080/api/students`
     - `GET http://localhost:8080/api/timetable?grade=6th`
     - `GET http://localhost:8080/api/paripath`
     - `GET http://localhost:8080/api/locker-logs?studentId=1`
     - `POST http://localhost:8080/api/ai/ask`

## Option B: Run the Full-Stack Web Application (Port 3000)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set `GEMINI_API_KEY` in `.env` (see `.env.example`).
3. Start the server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.
