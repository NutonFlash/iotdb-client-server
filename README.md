# IoTDB Client-Server

This repository contains a two-part application designed for high-performance data retrieval and processing from IoTDB. The application includes a client written in JavaScript and a server written in Java, communicating via gRPC.

## Overview

The `iotdb-client-server` project provides a powerful solution for fetching and processing time-series data from IoTDB using gRPC. The client fetches data via gRPC using WebWorkers, while the server handles data retrieval, compression, and serialization, ensuring efficient data transfer.

## Project Structure

- **Client**: Written in JavaScript, the client component fetches data from the server via gRPC using WebWorkers for parallel processing. This setup ensures that the client can handle data efficiently without blocking the main thread.

- **Server**: Written in Java, the server component processes requests received via RPC. Upon receiving a request, it:
  - Fetches data from IoTDB using multiple workers for parallel processing.
  - Encodes the data using GorillaCompression, a time-series compression algorithm.
  - Compresses the encoded data using ZSTD, a fast compression algorithm.
  - Serializes the compressed data and sends it in binary format to the client.

## How It Works

1. **Client-Server Communication**: The client sends requests to the server via gRPC. The server processes these requests and returns the data in an optimized, compressed binary format.

2. **Data Fetching**: On receiving a request, the server initiates multiple workers to fetch the required data from IoTDB, ensuring that large datasets are handled efficiently.

3. **Data Compression**:
   - **GorillaCompression**: The fetched data is first encoded using GorillaCompression, which is specifically designed for compressing time-series data.
   - **ZSTD Compression**: The encoded data is further compressed using ZSTD to reduce the data size significantly without compromising on speed.

4. **Data Transmission**: The compressed data is serialized into a binary format and sent back to the client, where it is processed and displayed as needed.

## Getting Started

### Prerequisites

- **IoTDB**: Ensure that IoTDB is installed and running.
- **Java**: The server component requires Java 8 or higher.
- **Node.js**: The client component requires Node.js and npm.

### Installation

1. **Install Client Dependencies**:
   Navigate to the `client` directory and install the required Node.js dependencies:
   ```bash
   cd client
   npm install

2. **Build the Server**:
   Navigate to the `server` directory and build the Java server:
   ```bash
   cd ../server
   mvn clean install

### Running the Application

1. **Start the Server**:
   After building, start the server using:
   ```bash
   java -jar target/iotdb-client-server.jar

2. **Run the Client**:
   ```bash
   npm start
