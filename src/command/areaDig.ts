// @ts-check
import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import minecraftData from "minecraft-data"
import {Block} from 'prismarine-block'
// @ts-ignore
import iv from 'mineflayer-web-inventory'
import * as v from 'vec3'
import MinecraftData from 'minecraft-data'
const { goals, Movements, pathfinder } = mcPathsFinder
// local modules
import { SETTINGS } from '../settings.js'

import { ChestsManager } from '../modules/chests.js'
import { collectItems } from '../modules/items.js'
import { lookAtMaster } from '../modules/look.js'
import { goToMaster } from '../modules/movement.js'
import { SimpleIterator, subdivideArea } from '../modules/utils.js'
import { reportOutofSpaceAndIdle } from '../modules/inventory.js'

export const areaDig = async function(bot:mineflayer.Bot){

  bot.removeAllListeners('physicsTick')
  bot.on("physicsTick",lookAtMaster)
  goToMaster(bot,4)

  let firstPos:v.Vec3|null = null
  let secondPos:v.Vec3|null = null
  let barrier:boolean = false
  let chestPosList:v.Vec3[] = []
  let barrelPosList:v.Vec3[] = []

  // Using wand to get position input
  function getPosInput(oldBlock:Block|null,newBlock:Block){
    //console.log("new"+newBlock.displayName)
    if(oldBlock){
      //console.log("old:" +oldBlock.displayName)
    }

    if(newBlock.displayName === SETTINGS.wandBlock){
      let pos = newBlock.position
      if(pos){
        if(!firstPos){
          firstPos = pos.floor()
          bot.whisper(SETTINGS.masterName,"First Position set["+firstPos.toArray()+"]")
        } else if (!secondPos) {
          secondPos = pos.floor()
          bot.whisper(SETTINGS.masterName,"Second Position set["+secondPos.toArray()+"]")
          barrier = true
          return
        } else {
          barrier = true
          return
        }
      } else {
        console.log("cannot get block pos")
      }
    }
    // chests(output)
    if(oldBlock && oldBlock.displayName === 'Chest'){
      let pos = oldBlock.position
      let index = chestPosList.findIndex((value:v.Vec3)=>{
        return value.x == pos.x && value.y == pos.y && value.z == pos.z
      })

      if(index > -1){
        chestPosList.splice(index,1)
        bot.whisper(SETTINGS.masterName,"Unregistered chest added at ["+pos.toArray()+"]")
      }
    }
    if(newBlock.displayName === 'Chest'){
      let pos = newBlock.position
      if(pos){
        bot.whisper(SETTINGS.masterName,"Registered chest added at ["+pos.toArray()+"]")
        chestPosList.push(pos)
      }
    }

    // barrels(tools input)
    if(oldBlock && oldBlock.displayName === 'Barrel'){
      let pos = oldBlock.position
      let index = barrelPosList.findIndex((value:v.Vec3)=>{
        return value.x == pos.x && value.y == pos.y && value.z == pos.z
      })

      if(index > -1){
        barrelPosList.splice(index,1)
        bot.whisper(SETTINGS.masterName,"Unregistered Barrel added at ["+pos.toArray()+"]")
      }
    }
    if(newBlock.displayName === 'Barrel'){
      let pos = newBlock.position
      if(pos){
        bot.whisper(SETTINGS.masterName,"Registered Barrel added at ["+pos.toArray()+"]")
        barrelPosList.push(pos)
      }
    }

    bot.once('blockUpdate',getPosInput)
  }
  bot.world.once('blockUpdate',getPosInput)

  while(!barrier){
    await new Promise(r => setTimeout(r, 2000)); // sleep
    goToMaster(bot,4)
    //console.log("woke and checked")
  }

  console.log("Successfully got all inputs!")
  bot.removeAllListeners('physicsTick')
  bot.removeAllListeners('blockUpdate')
  bot.pathfinder.stop()


  // intitalizes bots
  const outputChestsManager = new ChestsManager(chestPosList)
  const inputChestsManager = new ChestsManager(barrelPosList)

  const toolCounts = await inputChestsManager.getItemsCount(bot,
    [ SETTINGS.toolsPick, 
      SETTINGS.toolsShov, 
      SETTINGS.toolsAxe])
  const toolSetsNum = Math.min(...toolCounts)

  // start digging
  if(!firstPos || !secondPos) {
    firstPos = new v.Vec3(-100,-1000,-100)
    console.log("ERROR FIRSTPOS CHANGED")
    secondPos = new v.Vec3(-100,-1000,-100)
  }

  // spawn worker
  const numWorker = Math.max(toolSetsNum,1)
  let workers:mineflayer.Bot[] = []
  let workerJoined:boolean[] = []
  let workerErrors:number[] = []

  for(let i = 0; i < numWorker; i++){
    const index = i
    workerJoined.push(false)
    workerErrors.push(0)
    let newWorker:mineflayer.Bot = mineflayer.createBot({
      host: SETTINGS.serverIP,
      port: SETTINGS.serverPort,
      username: SETTINGS.botName + "_" + i
    })

    const retryBot = function(){
      workerErrors[index]++
      if(workerErrors[index] <= SETTINGS.errorRetries){
        let retryWorker =  mineflayer.createBot({
          host: SETTINGS.serverIP,
          port: SETTINGS.serverPort,
          username: SETTINGS.botName + "_" + i
        })
        retryWorker.on('spawn',()=>{
          console.log(newWorker.username + " spawned on retry:"+workerErrors[index])
          workerJoined[index] = true
        })
  
        retryWorker.on('error',retryBot)
        workers[index] = retryWorker
      } else {
        console.log("maximum retries reached for bot["+index+"]")
      }
    }
    newWorker.on('error',retryBot)
    newWorker.on('end',console.log)
    newWorker.on('spawn',()=>{
      console.log(newWorker.username + " spawned")
      workerJoined[i] = true
    })
    workers.push(newWorker)
    await new Promise(r => setTimeout(r, 1000)); // sleep
  }
  let alljoined = false
  // wait for all workers to join server
  while(!alljoined){
    await new Promise(r => setTimeout(r, 2000)); // sleep
    alljoined = true
    workerJoined.forEach(joined => {
      alljoined = alljoined && joined
    });
  }

  // gather all workers to interface
  for(let i = 0; i < numWorker; i++){
    if(SETTINGS.tpa){
      workers[i].chat("/tpa " + bot.username)
      await new Promise(r => setTimeout(r, 500)); // sleep
      bot.chat("/tpaccept")
      await new Promise(r => setTimeout(r, 500)); // sleep
    } else {
      workers[i].chat("/tp " + bot.username)
    }
  }
  // TODO: switch to wait on chunk loaded
  await new Promise(r => setTimeout(r, 2000)); // sleep

  // load PathFinders
  for(let i = 0; i < numWorker; i++){
    workers[i].loadPlugin(pathfinder)
  }
  
/*
  worker.version = '1.17'
  iv(worker)
  worker.version = '1.18'
*/

  await inputChestsManager.distributeItemsOnce(workers,
      [ SETTINGS.toolsPick,
        SETTINGS.toolsAxe,
        SETTINGS.toolsShov])

  console.log("finised Distributing")
  
  const lowestY = Math.min(firstPos.y,secondPos.y)
  const xMax = Math.max(firstPos.x,secondPos.x)
  const zMax = Math.max(firstPos.z,secondPos.z)
  const xMin = Math.min(firstPos.x,secondPos.x)
  const zMin = Math.min(firstPos.z,secondPos.z)

  let [minCorners, maxCorners] = subdivideArea(v.default([xMin,lowestY,zMin]),v.default([xMax,lowestY,zMax]),numWorker)

  let nextTask = 0
  let finishedTaskUntil = -1
  let taskStatuses:boolean[] = []
  let workerQueue:mineflayer.Bot[] = []
  workers.forEach(worker => {
    workerQueue.push(worker)
  });

  console.log("start executing tasks")

  while(finishedTaskUntil < minCorners.length - 1){
    console.log("checking queue ["+nextTask+","+ finishedTaskUntil+"]")
    while(workerQueue.length > 0 && nextTask < minCorners.length){
      let currWorker = workerQueue.shift()
      if(!currWorker){
        break
      }
      const currTaskID = nextTask
      let minCorner = minCorners[currTaskID]
      let maxCorner = maxCorners[currTaskID]
      taskStatuses.push(false)

      let taskSuccess:Promise<boolean> = miningTask(currWorker,
        minCorner.x,
        maxCorner.x,
        minCorner.z,
        maxCorner.z,lowestY, outputChestsManager)
      
      taskSuccess.then(()=>{
        finishedTaskUntil = Math.max(finishedTaskUntil, currTaskID)        
        workerQueue.push(currWorker as mineflayer.Bot)
        taskStatuses[currTaskID] = true
      })

      nextTask++
    }

    await new Promise(r => setTimeout(r, 5000)); // sleep
  }

  const deposit = async function (bot:mineflayer.Bot) {
    await inputChestsManager.depositAll(bot)
    await new Promise(r => setTimeout(r, 2000))
    bot.quit()
  }

  let allTaskSucess = true
  taskStatuses.forEach(element => {
    allTaskSucess = allTaskSucess && element
  });

  if(allTaskSucess){
    for(let i = 0; i < workers.length; i++){
      deposit(workers[i])
      await new Promise(r => setTimeout(r, 500))
    }
  } else {
    console.log("There was some failed tasks")
  }
  bot.whisper(SETTINGS.masterName,"Finished Request")
}

const miningTask = async function(
  _worker:mineflayer.Bot,
  _xMin:number,
  _xMax:number,
  _zMin:number,
  _zMax:number,
  _lowestY:number,
  _outputChests:ChestsManager) : Promise<boolean>{
  const minCorner = v.default([_xMin,_lowestY,_zMin])
  const maxCorner = v.default([_xMax,_lowestY,_zMax])
  console.log("Performing dig on ["+minCorner+","+maxCorner+"]")

  let blockIterator = new SimpleIterator(_xMin,_xMax,_zMin,_zMax,_lowestY)
  let currPos = blockIterator.next()

  const mcData = minecraftData(_worker.version)
  const movement = new Movements(_worker, mcData)
  movement.allowFreeMotion = true
  movement.placeCost = 100
  _worker.pathfinder.setMovements(movement)

  let collectCounter = 0
  let n = 0 

  while(currPos){
    n++
    let currblock = _worker.blockAt(currPos) 
    if(!currblock){
      console.log("block null") 
      currPos = blockIterator.next()
      continue
    }
    if(!(currblock.displayName === "Air")){
      if(currblock.diggable){
        //console.log("digging " + currblock.displayName + " at " + currPos.toArray())
        let tool = _worker.pathfinder.bestHarvestTool(currblock)
        if (tool) await _worker.equip(tool,'hand')
        //console.log("usedTool")

        if(!_worker.canDigBlock(currblock)){
          //console.log("going")
          // not withing reach and can dig blocka
          try {
            await _worker.pathfinder.goto(new goals.GoalGetToBlock(currPos.x,currPos.y,currPos.z),()=>{
              //console.log("went")
            })
          } catch (err) {
            console.log("GoTo had error, redoing")
            continue
          }

        } 
        //console.log("to dig")
        await _worker.dig(currblock)
        collectCounter++
        _worker.stopDigging()
        //console.log("dug")
      }
    }

    if(collectCounter >= SETTINGS.collectActionThreashold){
      _worker.pathfinder.stop()
      await collectItems(_worker,maxCorner,minCorner, 0)
      collectCounter = 0
    }
    if(_worker.inventory.emptySlotCount() <= SETTINGS.minEmtpySlotsDuringWork){
      _worker.pathfinder.stop()
      let offloadSuccess = await _outputChests.depositAll(_worker,SETTINGS.toolsFilter)
      if(!offloadSuccess){
        reportOutofSpaceAndIdle(_worker)
        return false
      }
    }

    currPos = blockIterator.next()
  }
  await collectItems(_worker,maxCorner,minCorner)

  _worker.pathfinder.stop()
  let offloadSuccess = await _outputChests.depositAll(_worker,SETTINGS.toolsFilter)
  //console.log("finished offload")

  console.log("finished one mining task")

  if(!offloadSuccess){
    reportOutofSpaceAndIdle(_worker)
    return false
  } else {
    return true
  }
}