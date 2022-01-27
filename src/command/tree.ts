import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import { SETTINGS } from '../settings.js'
import minecraftData from "minecraft-data"

import {Block} from 'prismarine-block'
import * as v from 'vec3'
import { ChestsManager } from '../modules/chests.js'
import { goToMaster } from '../modules/movement.js'
const { goals, Movements, pathfinder } = mcPathsFinder


const areaDig = async function(bot:mineflayer.Bot){

  bot.removeAllListeners('physicsTick')
  //bot.on("physicsTick",lookAtMaster)
  //goToMaster(bot,4)

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

  // Confirmation?

  // intitalizes bots
  const outputChestsManager = new ChestsManager(chestPosList)
  const inputChestsManager = new ChestsManager(barrelPosList)

  const toolCounts = await inputChestsManager.getItemsCount(bot,
    [ SETTINGS.toolsPick, 
      SETTINGS.toolsShov, 
      SETTINGS.toolsAxe])
  const toolSetsNum = Math.min(...toolCounts)


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

  await inputChestsManager.distributeItemsOnce(workers,
      [ SETTINGS.toolsPick,
        SETTINGS.toolsAxe,
        SETTINGS.toolsShov])

  console.log("finised Distributing")
  // functions for mining
  let finishedTaskUntil = -1
  let taskStatuses:boolean[] = []

  console.log("start executing tasks")

  let tasksLength = 0

  while(finishedTaskUntil < tasksLength){
    finishedTaskUntil++
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