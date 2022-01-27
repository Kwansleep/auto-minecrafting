import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import { SETTINGS } from '../settings.js'
import minecraftData from "minecraft-data"

import {Block} from 'prismarine-block'
import * as v from 'vec3'
import { ChestsManager } from '../modules/chests.js'
import { setGoalToMaster } from '../modules/movement.js'
import { getCornerInputsUsingWands } from '../modules/inputs.js'
import { posWithinXZ, SimpleIterator, sleep } from '../modules/utils.js'
import MinecraftData from 'minecraft-data'
import { allowEatFor, collectItemsWithinHeight } from '../modules/items.js'
import { reportOutofSpaceAndIdle } from '../modules/inventory.js'
const { goals, Movements, pathfinder } = mcPathsFinder

export const farmTree = async function(_bot:mineflayer.Bot, logtype:string,exitOnFinish:boolean = true, farmSapling:boolean = false){
  const mcData = MinecraftData(_bot.version)
  const logName = logtype + '_log'
  const saplingName = logtype + '_sapling'
  const leavesName = logtype + '_leaves'
  if(!mcData.itemsByName[saplingName]){
    return 
  }
  const saplingID = mcData.itemsByName[saplingName].id
  const diggingMovement = new Movements(_bot,mcData)
  diggingMovement.allow1by1towers = true
  diggingMovement.blocksCantBreak.add(mcData.blocksByName['barrel'].id)
  diggingMovement.blocksCantBreak.add(mcData.blocksByName['glass'].id)
  let scafoldIds:number[] = []
  SETTINGS.scaffoldBlock.forEach(blockName => {
    if(mcData.itemsByName[blockName]){
      scafoldIds.push(mcData.itemsByName[blockName].id)
    }
  });
  console.log(scafoldIds)
  diggingMovement.scafoldingBlocks = scafoldIds

  const collectingMovement = new Movements(_bot,mcData)
  collectingMovement.blocksCantBreak.add(mcData.blocksByName['barrel'].id)
  collectingMovement.blocksCantBreak.add(mcData.blocksByName['glass'].id)
  collectingMovement.placeCost = 1000
  collectingMovement.canDig = true
  collectingMovement.scafoldingBlocks = []

  let inputs = await getCornerInputsUsingWands(_bot)
  if(!inputs){
    console.log("input cancelled")
    return
  }

  const [ minCorner, maxCorner ] = inputs as unknown as [v.Vec3,v.Vec3]
  const middlePos = minCorner.plus(maxCorner).scale(0.5).floor()
  const radius = Math.ceil( Math.sqrt((maxCorner.x - minCorner.x) * (maxCorner.x - minCorner.x) / 2 + (maxCorner.z - minCorner.z) * (maxCorner.z - minCorner.z) / 2) )

  try {
    console.log("going " + middlePos)
    await _bot.pathfinder.goto(new goals.GoalXZ(middlePos.x,middlePos.z))
    console.log("went ")
  } catch (err){
    console.log("farmtree goto middle failed")
    return
  }

  console.log(radius)

  let chests = _bot.findBlocks({
    matching: (block:Block)=>{
      if(block.name === 'chest'){
        return true
      }
      return false},
    maxDistance: radius,
    count:10,
  })
  let barrels = _bot.findBlocks({
    matching: (block:Block)=>{
      if(block.name === 'barrel'){
        return true
      }
      return false},
    maxDistance: radius,
    count:10,
  })
  chests = chests.filter((value)=>{
    if(posWithinXZ(value,minCorner,maxCorner)){
      return true
    } else {
      return false
    }
  })
  barrels = barrels.filter((value)=>{
    if(posWithinXZ(value,minCorner,maxCorner)){
      return true
    } else {
      return false
    }
  })

  // intitalizes bots
  const outputChestsManager = new ChestsManager(chests)
  const inputChestsManager = new ChestsManager(barrels)


  let itemCount:number[] = await inputChestsManager.getItemsCount(_bot,
    [ SETTINGS.toolsAxe ])

  if(itemCount[0] < 1){
    "Not enough Tools to farm tree"
    return
  }

  const itemFilter = [
    saplingName,
    'bone_meal', 
    SETTINGS.toolsAxe,
    SETTINGS.scaffoldBlock[0],
    SETTINGS.foodName
  ]

  _bot.pathfinder.setMovements(collectingMovement)
  let hasEnough = await inputChestsManager.fillOneStack(_bot,itemFilter)
  let cycleCounter = 11

  while(hasEnough){
    cycleCounter++
    // grow tree
    try{
      await _bot.pathfinder.goto(new goals.GoalBlock(middlePos.x,middlePos.y,middlePos.z))
      await _bot.pathfinder.goto(new goals.GoalGetToBlock(middlePos.x,middlePos.y,middlePos.z))

      await _bot.equip(saplingID,"hand")

      let rootBlock = _bot.blockAt(middlePos.offset(0,-1,0))
      if(!rootBlock){
        break
      }
      let serverConfirmed = false
      await _bot.placeBlock(rootBlock,v.default([0,1,0]),()=>{
        serverConfirmed = true
      })
      while(!serverConfirmed){
        console.log("check if server confirmed")
        await sleep(500)
      }

      await _bot.equip(mcData.itemsByName['bone_meal'].id,"hand")

      let lookingBlock = _bot.blockAtCursor(4)
      let sapBlock = _bot.blockAt(middlePos)

      let boneMealCounter = 40

      while(lookingBlock && sapBlock && !(lookingBlock.name === logName)){
        _bot.activateBlock(sapBlock,()=>{})
        boneMealCounter--
        await sleep(500)
        lookingBlock = _bot.blockAtCursor(4)
        console.log("Boned!")
        if(boneMealCounter == 0){
          break;
        }
      }

    } catch {
      console.log("Grow tree goto failed, retrying")
      await sleep(5000)
      continue
    }

    await sleep(1000)

    _bot.pathfinder.setMovements(diggingMovement)
    // farm wood
    let blockIterator = new SimpleIterator(minCorner.x,maxCorner.x,minCorner.z,maxCorner.z,minCorner.y,minCorner.y + 32)
    let currPos = blockIterator.next()
    // break logs
    while(currPos){
      let currblock = _bot.blockAt(currPos) 
      if(!currblock){
        console.log("block null") 
        currPos = blockIterator.next()
        continue
      }
      if(currblock.name === logName || SETTINGS.scaffoldBlock.includes(currblock.name) || currblock.name === leavesName){

        if(currblock.name === leavesName && !farmSapling){
          currPos = blockIterator.next()
          continue
        }

        //console.log("digging " + currblock.displayName + " at " + currPos.toArray())
        let tool = _bot.pathfinder.bestHarvestTool(currblock)
        if (tool) await _bot.equip(tool,'hand')

        if(!_bot.canDigBlock(currblock)){
          // not withing reach and can dig blocka
          try {
            await _bot.pathfinder.goto(new goals.GoalBreakBlock(currPos.x,currPos.y,currPos.z,_bot,{range:5}))
          } catch (err) {
            console.log("GoTo had error, redoing")
            continue
          }
        } 
        await _bot.dig(currblock)
        _bot.stopDigging()
        
      }

      if(_bot.inventory.emptySlotCount() <= SETTINGS.minEmtpySlotsDuringWork){
        _bot.pathfinder.stop()
        let offloadSuccess = await outputChestsManager.depositAll(_bot,itemFilter)
        if(!offloadSuccess){
          reportOutofSpaceAndIdle(_bot)
          return false
        }
      }
      currPos = blockIterator.next()
    }
    _bot.pathfinder.setMovements(collectingMovement)
    await sleep(1000)
    if(!(await collectItemsWithinHeight(_bot,minCorner,maxCorner,2,0))){
      continue
    }

    await outputChestsManager.depositAll(_bot,itemFilter)

    if(cycleCounter > 10){
      console.log("Taking a break to eat")
      await allowEatFor(_bot)
      cycleCounter = 0
      console.log("break over")
    }

    hasEnough = await inputChestsManager.fillOneStack(_bot,itemFilter)
  }

  await inputChestsManager.depositAll(_bot)

  _bot.whisper(SETTINGS.masterName,"Finished Request")
  _bot.pathfinder.setMovements(new Movements(_bot,mcData))
  if(exitOnFinish){
    _bot.quit()
  }
}