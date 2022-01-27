import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import autoEat from "mineflayer-auto-eat"
import { enableEating } from '../modules/items.js'
import { SETTINGS } from '../settings.js'
import { lookAtPlayer } from '../modules/look.js'
import { chatIsWhisperFromMaster } from '../modules/chats.js'
import { throwAll } from '../modules/inventory.js'
const { goals } = mcPathsFinder

export const summonWorker = async function(bot:mineflayer.Bot, from:number,to:number = -1) {
  if (to == -1){
    to = from
  }

  let workers:mineflayer.Bot[] = [] 
  let workerJoined: boolean[] = []

  for(let i = from,index=0; i <= to; i++, index++){
    workerJoined.push(false)
    let newWorker = mineflayer.createBot({
      host: SETTINGS.serverIP,
      port: SETTINGS.serverPort,
      username: SETTINGS.botName + "_" + i
    })
    newWorker.loadPlugin(autoEat)
    newWorker.on('spawn',()=>{
      console.log(newWorker.username + " spawned")
      workerJoined[index] = true
    })
    enableEating(newWorker)

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
  let startingPos = bot.entity.position.floor()
  for(let i = from,index=0; i <= to; i++, index++){
    try{
      await bot.pathfinder.goto(new goals.GoalBlock(startingPos.x + index*2 + 2,startingPos.y,startingPos.z))
    } catch(error){}

    if(SETTINGS.tpa){
      workers[index].chat("/tpa " + bot.username)
      await new Promise(r => setTimeout(r, 500)); // sleep
      bot.chat("/tpaccept")
      await new Promise(r => setTimeout(r, 500)); // sleep
    } else {
      workers[index].chat("/tp " + bot.username)
    }
  }
  try{
    await bot.pathfinder.goto(new goals.GoalBlock(startingPos.x,startingPos.y,startingPos.z))
  } catch(err){
    console.log("caught error at goto")
  }

  for(let i = from,index=0; i <= to; i++, index++){

    workers[index].once('physicTick',async ()=>{
      await lookAtPlayer(workers[index],SETTINGS.masterName)
    })

    workers[index].on('chat',async (username:string,message:string,translate,chatMsg)=>{
      if(chatIsWhisperFromMaster(chatMsg)){
        console.log(message)
        if(message === "throw"){
          throwAll(workers[index])
        }
        if(message === "quit"){
          workers[index].quit()
        }
      }
    })
  }

  let centralCommands = function(username:string, message:string, translate:any, chatMsg:any, matches:any) {

    if(chatIsWhisperFromMaster(chatMsg)){
      const args = message.split(" ")
      if(args[0] && args[0] === 'tellsummon'){
        if(args[1] && args[1] === 'throw'){
          workers.forEach(worker =>{
            throwAll(worker)
          })
        } else if (args[1] && args[1] === 'quit'){
          workers.forEach(worker =>{
            worker.quit()
          })
          bot.removeListener('chat', centralCommands)
        }
      }
    }
  }

  bot.on('chat',centralCommands)
}