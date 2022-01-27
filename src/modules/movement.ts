// @ts-check
import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import minecraftData from "minecraft-data"
const { goals, Movements, pathfinder } = mcPathsFinder
// local modules
import { SETTINGS } from '../settings.js'
import { ReachEntity } from '../goal/customGoals.js'
import MinecraftData from 'minecraft-data'

export const setGoalToMaster = function(_bot:mineflayer.Bot,_reach:number){
  setGoalToPlayer(_bot,SETTINGS.masterName,_reach)
}

export const setGoalToPlayer = function(_bot:mineflayer.Bot,_playerName:string,_reach:number): boolean{
  const player = _bot.players[_playerName]
  if(!player){
    return false
  }
  const goal = new ReachEntity(player.entity,_reach)
  _bot.pathfinder.setGoal(goal)
  return true
}

export const setDefaultMovement = function(_bot:mineflayer.Bot){
  const mcData = MinecraftData(_bot.version)
  let moves = new Movements(_bot,mcData)

  moves.blocksCantBreak.add(mcData.blocksByName['glass'].id)
  moves.blocksCantBreak.add(mcData.blocksByName['barrel'].id)

  _bot.pathfinder.setMovements(moves)
}
