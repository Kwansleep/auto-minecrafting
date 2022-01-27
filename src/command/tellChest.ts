// @ts-check
import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import {Window} from 'prismarine-windows'
import {Block} from 'prismarine-block'
const { goals, Movements, pathfinder } = mcPathsFinder
// local modules
import { SETTINGS } from '../settings.js'
import { lookAtMaster } from '../modules/look.js'
import { goToMaster } from '../modules/movement.js'

export const tellChest = async function(bot:mineflayer.Bot){
  let finsh = false
  bot.removeAllListeners('physicsTick')
  bot.on("physicsTick",lookAtMaster)
  goToMaster(bot,4)  

  async function lookForChest(primaryChest:Block,isOpen:number){
    if(isOpen == 1){
      let pos = primaryChest.position

      await bot.pathfinder.goto(new goals.GoalGetToBlock(pos.x,pos.y,pos.z))
  
      if(!primaryChest){
        console.log("Chest Not found for unload")    
      }
    
      let chestInstance = await bot.openChest(primaryChest)
      let chestWindow = chestInstance as unknown as Window
      let itemList = chestWindow.containerItems()
      chestInstance.close()
  
      itemList.forEach(item => {
        bot.whisper(SETTINGS.masterName,"Item name:" + item.name)
      });
      finsh = true
    }
  }
          
  bot.once('chestLidMove',lookForChest)
  /*
  bot.on('whisper', (username:string, message:string) => {
    if(username === SETTINGS.masterName && message === 'stop'){
      finsh = true
    }
  })*/
  while(!finsh){
    await new Promise(r => setTimeout(r, 1000)); // sleep
  }
  bot.removeAllListeners('physicsTick')
  bot.whisper(SETTINGS.masterName,"Finished Request")
}