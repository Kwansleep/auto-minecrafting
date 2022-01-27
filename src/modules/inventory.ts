// @ts-check
import mineflayer from 'mineflayer'
// local modules
import { SETTINGS } from '../settings.js'
import { chatIsWhisperFromMaster } from './chats.js'
import { analyzeSlots } from './items.js'
import { lookAtPlayer } from './look.js'

export const throwAll = async function(bot:mineflayer.Bot){

  await lookAtPlayer(bot,SETTINGS.masterName)

  // TODO: can check to recursive style and modularize this
  let botItemList = bot.inventory.slots
  let [ids, count] = analyzeSlots(botItemList)

  for(let i = 0; i < ids.length; i++){
    await bot.toss(ids[i],null,count[i])
  }
}

export const reportOutofSpaceAndIdle = function(bot:mineflayer.Bot){
  bot.whisper(SETTINGS.masterName,"I cannot find chest to dump!")
  bot.on('chat',async (username:string,message:string,translate,chatMsg)=>{
    if(chatIsWhisperFromMaster(chatMsg)){
      console.log(message)
      if(message === "throw"){
        throwAll(bot)
      }
      if(message === "quit"){
        bot.quit()
      }
    }
  })
}