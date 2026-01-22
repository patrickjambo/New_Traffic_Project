# Rwanda Traffic Management System (TrafficGuard AI) - System Architecture

This document provides a comprehensive overview of the technologies, tools, and architecture used in the Rwanda Traffic Management System. It explains how each component works and how they integrate to provide a real-time traffic monitoring and incident detection solution.

---

## 🏗️ System Overview

The system is composed of five main components:
1.  **Backend API**: The central hub for data management and communication.
2.  **Government Dashboard (Frontend)**: A web-based portal for authorities to monitor traffic and manage incidents.
3.  **Mobile Application**: A Flutter-based app for field officers and public users.
4.  **AI Engine**: A Python-based service for real-time traffic analysis and incident detection.
5.  **Database**: A spatial database for storing traffic data, incidents, and user information.

---

## 🛠️ Technology Stack

### 1. Backend API (Node.js & Express)
The backend serves as the "brain" of the application, handling authentication, data processing, and real-time communication.

-   **Framework**: [Express.js](https://expressjs.com/) (Node.js)
-   **Real-time Communication**: [Socket.io](https://socket.io/) for live updates to the dashboard and mobile app.
-   **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) and [Bcryptjs](https://www.npmjs.com/package/bcryptjs) for secure password hashing.
-   **Validation**: [Express-validator](https://express-validator.github.io/docs/) and [Joi](https://joi.dev/).
-   **File Handling**: [Multer](https://github.com/expressjs/multer) for processing image and video uploads.
-   **Notifications**: [Twilio](https://www.twilio.com/) for SMS alerts and [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) for push notifications.

### 2. Government Dashboard (React & Vite)
A modern, responsive web application for government officials to visualize traffic data and manage deployments.

-   **Framework**: [React](https://reactjs.org/) with [Vite](https://vitejs.dev/) for fast development and builds.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first, responsive design.
-   **Maps & GIS**: [Leaflet](https://leafletjs.com/) and [React-Leaflet](https://react-leaflet.js.org/) for interactive maps.
-   **Data Visualization**: [Recharts](https://recharts.org/) for traffic statistics and analytics.
-   **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth UI transitions.
-   **Icons**: [Lucide React](https://lucide.dev/) and [React Icons](https://react-icons.github.io/react-icons/).

### 3. Mobile Application (Flutter)
A cross-platform mobile app for field officers to receive alerts and report incidents.

-   **Framework**: [Flutter](https://flutter.dev/) (Dart)
-   **Maps**: [Google Maps Flutter](https://pub.dev/packages/google_maps_flutter).
-   **Location Services**: [Geolocator](https://pub.dev/packages/geolocator) and [Location](https://pub.dev/packages/location).
-   **Communication**: [Socket_io_client](https://pub.dev/packages/socket_io_client) for real-time alerts.
-   **Push Notifications**: [Firebase Messaging](https://pub.dev/packages/firebase_messaging).
-   **Local Storage**: [Shared Preferences](https://pub.dev/packages/shared_preferences) and [Flutter Secure Storage](https://pub.dev/packages/flutter_secure_storage).

### 4. AI Engine (Python & YOLOv8)
A dedicated service that processes video feeds to detect traffic incidents and analyze vehicle flow.

-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) for high-performance API endpoints.
-   **Computer Vision**: [OpenCV](https://opencv.org/) for image processing.
-   **Object Detection**: [YOLOv8 (Ultralytics)](https://ultralytics.com/yolov8) for real-time vehicle and incident detection.
-   **Data Processing**: [NumPy](https://numpy.org/) and [Pillow](https://python-pillow.org/).
-   **Communication**: [HTTPX](https://www.python-httpx.org/) for sending detection results to the backend.

### 5. Database (PostgreSQL & PostGIS)
A robust relational database with spatial capabilities.

-   **Database**: [PostgreSQL](https://www.postgresql.org/).
-   **Spatial Extension**: [PostGIS](https://postgis.net/) for handling geographic coordinates, routes, and heatmaps.
-   **Connection Pool**: [pg](https://node-postgres.com/) (Node.js driver).

---

## 🔄 How It Works Together

The integration between these components follows a structured data flow:

1.  **Detection**: The **AI Engine** analyzes traffic camera feeds using YOLOv8. When an incident (e.g., accident, congestion) is detected, it sends a POST request to the **Backend API**.
2.  **Processing**: The **Backend API** receives the incident data, stores it in the **PostgreSQL** database (using PostGIS for location data), and triggers notifications.
3.  **Real-time Alerts**:
    *   The **Backend** emits a WebSocket event via **Socket.io** to the **Government Dashboard**.
    *   The **Backend** sends a push notification via **Firebase** to the **Mobile App**.
4.  **Action**:
    *   Authorities on the **Dashboard** see the incident on the map and can deploy officers.
    *   Field officers receive the alert on their **Mobile App**, see the location, and navigate to the scene.
5.  **Public Access**: Public users can view traffic heatmaps and reported incidents on the dashboard or mobile app to plan their routes.

---

## 🚢 Deployment (Docker)

The system is containerized using **Docker** and **Docker Compose**, ensuring consistency across development and production environments.

-   `docker-compose.yml` orchestrates the Backend, AI Service, and Database containers.
-   Environment variables are used to manage secrets and service URLs.

---

## 📈 Future Scalability

-   **Redis**: Can be added for caching frequently accessed traffic data.
-   **Kubernetes**: For scaling the AI Engine across multiple GPU nodes.
-   **ELK Stack**: For advanced log analysis and monitoring.
