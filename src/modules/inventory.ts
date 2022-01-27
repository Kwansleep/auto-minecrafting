// @ts-check
import mineflayer from 'mineflayer'
// local modules
import { SETTINGS } from '../settings.js'
import { chatIsWhisperFromMaster } from './chats.js'
import { lookAtPlayer } from './look.js'
import {Item} from 'prismarine-item'

export const throwAll = async function(bot:mineflayer.Bot,lookAt:string = SETTINGS.masterName){

  await lookAtPlayer(bot,lookAt)

  // TODO: maybe move to an slot by slot approach?
  let botItemList = bot.inventory.slots
  let [ids, count] = analyzeSlots(botItemList)
  let untossed:number[] = [] 

  for(let i = 0; i < ids.length; i++){
    try {
      await bot.toss(ids[i],null,count[i])
    } catch {
      untossed.push(i)
    }
  }

  if(untossed.length == 0){
    return 
  }

  // try to unequip everything
  try {
    await bot.unequip('head')
    await bot.unequip('torso')
    await bot.unequip('legs')
    await bot.unequip('feet')
    await bot.unequip('off-hand') 
  } catch {}
  
  for(let i = 0; i < untossed.length; i++){
    let index = untossed[i]
    try {
      await bot.toss(ids[index],null,count[index])
    } catch {
      console.log("failed to toss item with id ["+ids[index]+"]")
    }
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

export const analyzeSlots = function(slots:Item[]):[number[],number[]]{
  let counts:number[] = []
  let ids:number[] = []

  for(let i = 0; i< slots.length;i++){
    if(slots[i]){
      let index = ids.indexOf(slots[i].type)
      if(index >= 0){
        // already evaluted similar item
        counts[index] += slots[i].count
      } else {
        // new item
        ids.push(slots[i].type)
        counts.push(slots[i].count)
      }
    }
  }
  return [ids,counts]
}