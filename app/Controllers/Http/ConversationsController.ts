import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Conversation from 'App/Models/Conversation'
import Message from 'App/Models/Message'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { schema, rules } from '@ioc:Adonis/Core/Validator'

export default class ConversationsController {

    /**
   * @swagger
   * /questions:
   * post:
   * summary: Send a question to the chatbot and get a response.
   * description: This endpoint accepts a user's question, saves it, sends it to an external chatbot API, saves the bot's response, and returns the response.
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * question:
   * type: string
   * description: The user's question.
   * example: "Hello, how are you?"
   * sessionId:
   * type: string
   * format: uuid
   * description: Optional. Existing session ID to continue a conversation. If not provided, a new conversation is started.
   * example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   * responses:
   * 200:
   * description: Successful response with the bot's answer.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * sessionId:
   * type: string
   * format: uuid
   * description: The session ID of the conversation.
   * message:
   * type: string
   * description: The bot's response message.
   * 400:
   * description: Invalid input.
   * 500:
   * description: Internal server error or external API error.
   */
  public async sendQuestion({ request, response }: HttpContextContract) {
    // Define validation schema for the incoming request
    const questionSchema = schema.create({
      question: schema.string({ trim: true }, [
        rules.minLength(1)
      ]),
      sessionId: schema.string.optional({ trim: true }, [
        rules.uuid()
      ])
    })

    try {
      // Validate the request body
      const payload = await request.validate({ schema: questionSchema })
      const userQuestion = payload.question
      let conversation: Conversation | null = null
      let currentSessionId: string

      // Check if a session ID was provided to continue an existing conversation
      if (payload.sessionId) {
        conversation = await Conversation.findBy('session_id', payload.sessionId)
        if (!conversation) {
          // If session ID provided but not found, create a new one and use the provided ID
          currentSessionId = payload.sessionId
          conversation = await Conversation.create({ session_id: currentSessionId })
        } else {
          currentSessionId = conversation.session_id
        }
      } else {
        // If no session ID, create a new conversation
        currentSessionId = uuidv4()
        conversation = await Conversation.create({ session_id: currentSessionId })
      }

      // Ensure conversation object exists (should always if logic above is correct)
      if (!conversation) {
        return response.internalServerError({ message: 'Failed to create or find conversation.' })
      }

      // 1. Save user's question to PostgreSQL
      // Removed 'const userMessage =' as the variable was not used after creation.
      await Message.create({
        senderType: 'user',
        message: userQuestion,
      })

      // 2. Make request to external chatbot API
      const externalApiUrl = 'https://api.majadigidev.jatimprov.go.id/api/external/chatbot/send-message'
      let botResponseText: string = 'Sorry, I could not get a response from the chatbot at this time.'

      try {
        const externalApiResponse = await axios.post(externalApiUrl, {
          session_id: currentSessionId, // Use the generated/provided session ID for the external API
          message: userQuestion,
        })

        // Assuming the external API returns the bot's message in a 'message' field
        if (externalApiResponse.data && externalApiResponse.data.message) {
          botResponseText = externalApiResponse.data.message
        } else {
          console.warn('External API response did not contain a "message" field:', externalApiResponse.data)
        }
      } catch (externalApiError) {
        console.error('Error calling external chatbot API:', externalApiError.message)
        // You might want to log the full error for debugging in production
        // console.error('External API Error Details:', externalApiError.response ? externalApiError.response.data : externalApiError);
      }

      // 3. Save bot's response to PostgreSQL
      // Note: No conversationId is passed to Message.create as per your migration
      const botMessage = await Message.create({
        senderType: 'bot',
        message: botResponseText,
      })

      // 4. Update the conversation with the last message's ID and text
      // These column names (messagesId, lastMessages) match your migration's 'messages_id' and 'last_messages'
      conversation.messagesId = botMessage.id
      conversation.lastMessages = botMessage.message
      await conversation.save()

      // 5. Return the bot's response to the user
      return response.ok({ sessionId: currentSessionId, message: botResponseText })

    } catch (error) {
      if (error.messages && error.messages.errors) {
        // Validation errors
        return response.badRequest({ errors: error.messages.errors })
      }
      console.error('Error in sendQuestion:', error)
      return response.internalServerError({ message: 'An unexpected error occurred.', error: error.message })
    }
  }

  /**
   * @swagger
   * /conversation:
   * get:
   * summary: Get all conversations.
   * description: Retrieve a list of all conversations, with optional filtering and pagination.
   * parameters:
   * - in: query
   * name: sessionId
   * schema:
   * type: string
   * format: uuid
   * description: Filter conversations by a specific session ID.
   * - in: query
   * name: page
   * schema:
   * type: integer
   * default: 1
   * description: Page number for pagination.
   * - in: query
   * name: limit
   * schema:
   * type: integer
   * default: 10
   * description: Number of conversations per page.
   * responses:
   * 200:
   * description: A list of conversations.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * meta:
   * type: object
   * properties:
   * total:
   * type: integer
   * perPage:
   * type: integer
   * currentPage:
   * type: integer
   * lastPage:
   * type: integer
   * data:
   * type: array
   * items:
   * $ref: '#/components/schemas/ConversationSummary' # Assuming a schema for conversation summary
   * 500:
   * description: Internal server error.
   */
  public async getAllConversations({ request, response }: HttpContextContract) {
    try {
      const { sessionId, page = 1, limit = 10 } = request.qs()

      // Preload the actual last message object for richer data if needed
      const query = Conversation.query().preload('lastMessage')

      if (sessionId) {
        query.where('session_id', sessionId)
      }

      const conversations = await query.paginate(page, limit)

      return response.ok(conversations.serialize())
    } catch (error) {
      console.error('Error in getAllConversations:', error)
      return response.internalServerError({ message: 'Failed to retrieve conversations.', error: error.message })
    }
  }

  /**
   * @swagger
   * /conversation/{id_or_uuid}:
   * get:
   * summary: Get details for a specific conversation.
   * description: Retrieve conversation details, including its last message, identified by its primary ID or session UUID.
   * parameters:
   * - in: path
   * name: id_or_uuid
   * schema:
   * type: string
   * required: true
   * description: The primary ID (integer) or session UUID (string) of the conversation.
   * example: "1"
   * - in: path
   * name: id_or_uuid
   * schema:
   * type: string
   * format: uuid
   * required: true
   * description: The primary ID (integer) or session UUID (string) of the conversation.
   * example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   * responses:
   * 200:
   * description: Conversation details with its last message.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * id:
   * type: integer
   * sessionId:
   * type: string
   * format: uuid
   * messagesId:
   * type: integer
   * nullable: true
   * lastMessages:
   * type: string
   * nullable: true
   * createdAt:
   * type: string
   * format: date-time
   * updatedAt:
   * type: string
   * format: date-time
   * lastMessage:
   * type: object
   * properties:
   * id:
   * type: integer
   * senderType:
   * type: string
   * message:
   * type: string
   * createdAt:
   * type: string
   * format: date-time
   * updatedAt:
   * type: string
   * format: date-time
   * nullable: true
   * 404:
   * description: Conversation not found.
   * 500:
   * description: Internal server error.
   */
  public async getConversationMessages({ params, response }: HttpContextContract) {
    const idOrUuid = params.id

    try {
      let conversation: Conversation | null

      // Check if the parameter is a valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrUuid)

      if (isUUID) {
        conversation = await Conversation.query()
          .where('session_id', idOrUuid)
          .preload('lastMessage') // Only preload the last message as per schema
          .first()
      } else {
        // Assume it's a primary key (integer)
        conversation = await Conversation.query()
          .where('id', idOrUuid)
          .preload('lastMessage') // Only preload the last message as per schema
          .first()
      }

      if (!conversation) {
        return response.notFound({ message: 'Conversation not found.' })
      }

      // Since there's no direct 'hasMany' relationship from Conversation to Message
      // based on your migration, we can only return the conversation and its single last message.
      return response.ok(conversation.serialize())
    } catch (error) {
      console.error('Error in getConversationMessages:', error)
      return response.internalServerError({ message: 'Failed to retrieve conversation details.', error: error.message })
    }
  }

  /**
   * @swagger
   * /conversation/{id}:
   * delete:
   * summary: Delete a conversation.
   * description: Deletes a conversation. Note: This will also set 'messages_id' and 'last_messages' to NULL in the conversation table if the referenced message is deleted. (Nilai Plus)
   * parameters:
   * - in: path
   * name: id
   * schema:
   * type: integer
   * required: true
   * description: The primary ID of the conversation to delete.
   * responses:
   * 204:
   * description: Conversation successfully deleted.
   * 404:
   * description: Conversation not found.
   * 500:
   * description: Internal server error.
   */
  public async deleteConversation({ params, response }: HttpContextContract) {
    try {
      const conversation = await Conversation.find(params.id)

      if (!conversation) {
        return response.notFound({ message: 'Conversation not found.' })
      }

      // When a conversation is deleted, the onDelete('SET NULL') on messages_id in conversations
      // means that if the referenced message exists, its messages_id in conversations will be set to null.
      // Messages themselves are not directly deleted through this action, as there's no cascade from conversation to message.
      await conversation.delete()

      return response.noContent() // 204 No Content for successful deletion
    } catch (error) {
      console.error('Error in deleteConversation:', error)
      return response.internalServerError({ message: 'Failed to delete conversation.', error: error.message })
    }
  }

  /**
   * @swagger
   * /message/{id}:
   * delete:
   * summary: Delete a specific message.
   * description: Deletes a single message. If this message was referenced as 'messages_id' by any conversation, that conversation's 'messages_id' and 'last_messages' will be set to NULL. (Nilai Plus)
   * parameters:
   * - in: path
   * name: id
   * schema:
   * type: integer
   * required: true
   * description: The primary ID of the message to delete.
   * responses:
   * 204:
   * description: Message successfully deleted.
   * 404:
   * description: Message not found.
   * 500:
   * description: Internal server error.
   */
  public async deleteMessage({ params, response }: HttpContextContract) {
    try {
      const message = await Message.find(params.id)

      if (!message) {
        return response.notFound({ message: 'Message not found.' })
      }

      // Find any conversations that reference this message as their last_message
      // and set their messages_id and last_messages to null.
      // This is necessary because there's no direct conversation_id on the message itself.
      const conversationsToUpdate = await Conversation.query()
        .where('messages_id', message.id)

      for (const conv of conversationsToUpdate) {
        conv.messagesId = null
        conv.lastMessages = null
        await conv.save()
      }

      await message.delete()

      return response.noContent()
    } catch (error) {
      console.error('Error in deleteMessage:', error)
      return response.internalServerError({ message: 'Failed to delete message.', error: error.message })
    }
  }
}
