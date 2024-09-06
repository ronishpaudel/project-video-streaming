# Project Video Streaming - Video Upload and HLS Conversion Server

This project is an Express server application designed to handle video uploads, convert them to the HLS (HTTP Live Streaming) format using `ffmpeg`, and serve the converted videos. The server also provides an endpoint to list all available videos in HLS format.

## Features

- **Video Upload**: Allows users to upload videos to the server using `multer`.
- **HLS Conversion**: Automatically converts uploaded videos to HLS format using `ffmpeg`.
- **UUID for Unique Filenames**: Each uploaded video is renamed using a UUID for unique identification.
- **Static File Serving**: Serves HLS files with proper MIME types, including `.m3u8` playlists and `.ts` segments.
- **List Available Videos**: Provides an endpoint to retrieve a list of available videos in HLS format.

## Prerequisites

Before running the application, ensure that the following dependencies are installed:

- [Node.js](https://nodejs.org/)
- [ffmpeg](https://ffmpeg.org/)

## Installation

1. **Clone the Repository**:

   ```bash
   git clone git@github.com:ronishpaudel/project-video-streaming.git
   cd project-video-streaming
   ```

2. **Install Dependencies**:

- Run the following command to install the necessary dependencies for the project:

```bash
npm install
```

3.**Start the Server in Development Mode**:

- To run the server in development mode with automatic reloading, use the following command:

```bash
npm run dev
```

4.**Access the Application**:

- Once the server is running, you can access the application by visiting http://localhost:{port}. You can upload videos and retrieve them in HLS format.
