/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => {
  return { hello: 'world' }
})

// Route to handle sending a question and getting a bot response
Route.post('/questions', 'ConversationsController.sendQuestion')

// Route to get a list of all conversations, with optional filters
Route.get('/conversation', 'ConversationsController.getAllConversations')

// Route to get a specific conversation by ID or UUID
Route.get('/conversation/:id_or_uuid', 'ConversationsController.getConversationById')

// Route to delete a specific conversation by ID
// This is a "Nilai Plus" route as per the original specification
Route.delete('/conversation/:id', 'ConversationsController.deleteConversation')

// Route to delete a specific message by ID
// This is a "Nilai Plus" route as per the original specification
Route.delete('/message/:id', 'ConversationsController.deleteMessage')