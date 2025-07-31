# Chatbot REST API using AdonisJS v5

This project is a simple REST API built with AdonisJS v5 and PostgreSQL. The API provides endpoints to interact with a chatbot system, storing conversations and messages, and forwarding user queries to an external chatbot service.

## Table of Contents

[Prerequisites](#prerequisites)\
[Installation](#installation)\
[Configuration](#configuration)\
[Running the Project](#running-the-project)\
[API Endpoints](#api-endpoints)\
[1. Send Question (POST /questions)](#1-send-question-post-questions)\
[2. Get All Conversations (GET /conversation)](#2-get-all-conversations-get-conversation)\
[3. Get Specific Conversation (GET /conversation/:id_or_uuid)](#3-get-specific-conversation-get-conversationid_or_uuid)\
[4. Delete Conversation (DELETE /conversation/:id)](#4-delete-conversation-delete-conversationid)\
[5. Delete Message (DELETE /message/:id)](#5-delete-message-delete-messageid)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- Node.js (v18.x or later)
- npm or yarn
- Docker and Docker Compose
- Git

## Installation

1. Clone the repository

2. Install project dependencies:

        npm install
        or
        yarn

3. Run the database with Docker Compose:

    This will spin up a PostgreSQL container and set up a persistent volume for data.

        docker-compose up -d

## Configuration

### Create the environment file:

Copy the example environment file to create your own.

    cp .env.example .env

### Configure the PostgreSQL database:
    
Open the newly created .env file and update the database connection details to match the docker-compose.yml file.

    # .env
    DB_CONNECTION=pg
    PG_HOST=localhost
    PG_PORT=5432
    PG_USER=postgres
    PG_PASSWORD=postgres
    PG_DB_NAME=postgres

### Run database migrations:    
This will create the necessary conversations and messages tables inside the running Docker container's database.

    node ace migration:run

## Running the Project

To start the AdonisJS development server with file watching, run the following command:

    node ace serve --watch

The API will be available at http://localhost:3333.

## API Endpoints

You can test these endpoints using a tool like Postman, Insomnia, or curl.
### 1. Send Question (POST /questions)

This endpoint is used to send a user message to the chatbot. It either starts a new conversation or continues an existing one.

    URL: http://localhost:3333/questions
    Method: POST
    Request Body (JSON):

        New Conversation:
        {
          "question": "Hello, how are you?"
        }

        Existing Conversation: (Use a sessionId returned from a previous request)
        {
          "sessionId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
          "question": "Can you tell me more about it?"
        }

Example curl command:

    curl --location 'http://localhost:3333/questions' \
    --header 'Content-Type: application/json' \
    --data '{
        "question": "What is the capital of Indonesia?"
    }'

### 2. Get All Conversations (GET /conversation)

Retrieves a paginated list of all conversations.

    URL: http://localhost:3333/conversation
    Method: GET
    Query Parameters (Optional):
        sessionId: Filter conversations by a specific session UUID.
        page: The page number for pagination (e.g., ?page=2).
        limit: The number of items per page (e.g., ?limit=5).

Example curl command:

    curl --location 'http://localhost:3333/conversation'

### 3. Get Specific Conversation (GET /conversation/:id_or_uuid)

Retrieves the details of a single conversation, including the id, session_id, and the last message.

    URL: http://localhost:3333/conversation/<id_or_uuid>
    Method: GET
    Parameters:
        id_or_uuid: The primary key ID (integer) or the session_id (UUID) of the conversation.

Example curl commands:

By primary key ID

    curl --location 'http://localhost:3333/conversation/1'

By session UUID

    curl --location 'http://localhost:3333/conversation/a1b2c3d4-e5f6-7890-1234-567890abcdef'

### 4. Delete Conversation (DELETE /conversation/:id)

Nilai Plus Feature: Deletes a conversation and will set the messages_id to null if the last message was referencing it.

    URL: http://localhost:3333/conversation/<id>
    Method: DELETE
    Parameters:
        id: The primary key ID (integer) of the conversation to delete.

Example curl command:

    curl --location --request DELETE 'http://localhost:3333/conversation/1'

### 5. Delete Message (DELETE /message/:id)

Nilai Plus Feature: Deletes a specific message. If this message was the last message of a conversation, that conversation's messages_id and last_messages will be set to null.

    URL: http://localhost:3333/message/<id>
    Method: DELETE
    Parameters:
        id: The primary key ID (integer) of the message to delete.

Example curl command:

    curl --location --request DELETE 'http://localhost:3333/message/1'
