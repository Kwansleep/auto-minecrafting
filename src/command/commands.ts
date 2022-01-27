// @ts-check
import mineflayer from 'mineflayer'
import * as v from 'vec3'
// local modules
import { SETTINGS } from '../settings.js'
import { summonWorker } from '../command/summonWorker.js'
import { areaDig } from './areaDig.js'
import { readChests, unload } from '../modules/chests.js'
import { tellChest } from './tellChest.js'
import { subdivideArea } from '../modules/utils.js'
import { throwAll } from '../modules/inventory.js'
import { setGoalToMaster } from '../modules/movement.js'
import MinecraftData from 'minecraft-data'
import { getCornerInputsUsingWands } from '../modules/inputs.js'
import { Movements } from 'mineflayer-pathfinder'
import { farmTree } from './tree.js'

export const processCommand = function(bot:mineflayer.Bot, message:string){
  const args = message.split(" ")
  const command = args[0]

  switch(command){
    case "come":
      if(SETTINGS.tpa){
        bot.chat("/tpa " + SETTINGS.masterName)
      } else {
        bot.chat("/tp " + SETTINGS.masterName)
      }
      break
    case "dig":
      // initiate areaDig proceedures
        areaDig(bot)
      break
    case "open":
        readChests(bot)
      break
    case "stop":
        clearCommands(bot)
      break
    case "unload":
        unload(bot,v.default([35,-60,-436]),SETTINGS.toolsFilter)
      break
    case "test":
        testCommand(bot)
      break
    case "throw":
        throwAll(bot)
      break
    case "report":
        reportInfo(bot)
      break
    case "tree":
        farmTree(bot,SETTINGS.woodType)
      break
    case "summon":
      if(args[1] && args[2]){
        summonWorker(bot,parseInt(args[1]),parseInt(args[2]))
      } else {
        bot.whisper(SETTINGS.masterName,"Not enough arguments, 2 expected")
      }
      break;
    case "tellchest":
        tellChest(bot)
      break
    case "disconnect":
      bot.chat("/msg " + SETTINGS.masterName + " Bye, have a nice day master")
      bot.quit()
      break
    case "stop":
      break
    case "tellsummon":
      break
    default:
      bot.chat("/msg " + SETTINGS.masterName + " Sorry, I do not know a command [" + command + "]")
  }
}

const clearCommands = function(bot:mineflayer.Bot){
  bot.removeAllListeners('physicsTick')
}

const reportInfo = async function(bot:mineflayer.Bot) {
  console.log(bot.inventory.emptySlotCount())
}

const testCommand = async function(bot:mineflayer.Bot){
  const mcData = MinecraftData(bot.version)
  //console.log(bot.inventory.count(mcData.itemsByName[SETTINGS.wandBlock].id,null))
  bot.pathfinder.setMovements(new Movements(bot,mcData))
  console.log(await getCornerInputsUsingWands(bot))
}

