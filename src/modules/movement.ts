// @ts-check
import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import minecraftData from "minecraft-data"
const { goals, Movements, pathfinder } = mcPathsFinder
// local modules
import { SETTINGS } from '../settings.js'
import { ReachEntity } from '../goal/customGoals.js'

export const goToMaster = function(bot:mineflayer.Bot,reach:number){
  const playerMaster = bot.players[SETTINGS.masterName]
  if(!playerMaster){
    console.log("Master not found")
    return
  }
  //console.log(bot.version)
  const mcData = minecraftData(bot.version)
  const movement = new Movements(bot, mcData)

  bot.pathfinder.setMovements(movement)

  const goal = new ReachEntity(playerMaster.entity,reach)
  bot.pathfinder.setGoal(goal) // true, for continuous follow
}