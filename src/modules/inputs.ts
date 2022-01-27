// @ts-check
import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import * as v from 'vec3'
import autoEat from "mineflayer-auto-eat"
// @ts-ignore
import iv from 'mineflayer-web-inventory'
import MinecraftData from 'minecraft-data'
import { Block } from 'prismarine-block'
import { Entity } from 'prismarine-entity'
import { SETTINGS } from '../settings.js'
import { setGoalToMaster } from './movement.js'
const { pathfinder } = mcPathsFinder
// local modules



// returns Tuple of [minCorner, MaxCorner]
export const getCornerInputsUsingWands = async function(_bot:mineflayer.Bot,_followMaster:boolean = true): Promise<[v.Vec3,v.Vec3]|null>{
  let firstPos:v.Vec3|null = null
  let secondPos:v.Vec3|null = null
  let finishPosInputs:boolean = false
  const mcData = MinecraftData(_bot.version)
  const wandID = mcData.itemsByName[SETTINGS.wandBlock].id

  // Using wand to get position input
  function getPosInput(oldBlock:Block|null,newBlock:Block){
    if(newBlock.name === SETTINGS.wandBlock){
      let pos = newBlock.position
      if(pos){
        if(!firstPos){
          firstPos = pos.floor()
          _bot.whisper(SETTINGS.masterName,"First Position set["+firstPos.toArray()+"]")
        } else if (!secondPos) {
          secondPos = pos.floor()
          _bot.whisper(SETTINGS.masterName,"Second Position set["+secondPos.toArray()+"]")
          finishPosInputs = true
          return
        } else {
          finishPosInputs = true
          return
        }
      } else {
        console.log("cannot get block pos")
      }
    }
    _bot.world.once('blockUpdate',getPosInput)
  }
  _bot.world.once('blockUpdate',getPosInput)

  while(!finishPosInputs && _followMaster){
    await new Promise(r => setTimeout(r, 2000)); // sleep
    let wandCount = _bot.inventory.count(wandID,null)
    if(wandCount > 0){
      _bot.whisper(SETTINGS.masterName,"Wand Item Detected in Inventory, cancelling position selection")
      _bot.toss(wandID,null,wandCount)
      break
    }
    setGoalToMaster(_bot,4)
  }

  _bot.removeListener('blockUpdate',getPosInput)
  //_bot.pathfinder.stop()

  if(finishPosInputs){
    firstPos = firstPos as unknown as v.Vec3
    secondPos = secondPos as unknown as v.Vec3
    const minCorner = v.default([
      Math.min(firstPos.x,secondPos.x),
      Math.min(firstPos.y,secondPos.y),
      Math.min(firstPos.z,secondPos.z)
    ])
    const maxCorner = v.default([
      Math.max(firstPos.x,secondPos.x),
      Math.max(firstPos.y,secondPos.y),
      Math.max(firstPos.z,secondPos.z)
    ])
    console.log("Successfully got all inputs!")
    return [minCorner,maxCorner]
  } else {
    // cancelled
    return null
  }
}


