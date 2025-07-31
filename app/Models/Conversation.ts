import { DateTime } from 'luxon'
import { BaseModel, belongsTo, BelongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Message from './Message'

export default class Conversation extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public session_id: string

  @column({ columnName: 'messages_id' })
  public messagesId: number | null

  @column({ columnName: 'last_messages' })
  public lastMessages: string | null // Nullable as per migration

  @belongsTo(() => Message, {
    foreignKey: 'messages_id',
  })
  public lastMessage: BelongsTo<typeof Message>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
