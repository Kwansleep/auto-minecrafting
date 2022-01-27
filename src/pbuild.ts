// @ts-check
import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import autoEat from "mineflayer-auto-eat"
// @ts-ignore
import iv from 'mineflayer-web-inventory'
import MinecraftData from 'minecraft-data'
const { pathfinder } = mcPathsFinder
// local modules
import { SETTINGS } from './settings.js'
import { processCommand } from './command/commands.js'
import { chatIsWhisperFromMaster } from './modules/chats.js'

const main = function(){

  let interfaceBot = mineflayer.createBot({
    host: SETTINGS.serverIP,
    port: SETTINGS.serverPort,
    username: SETTINGS.interfaceBotName
  })

  interfaceBot.loadPlugin(pathfinder)
  interfaceBot.loadPlugin(autoEat)

  interfaceBot.on('spawn',()=>{
    console.log("spawned")
  })
  interfaceBot.loadPlugin(autoEat)

  interfaceBot.on('chat', (username:string, message:string, translate, chatMsg, matches) => {
    console.log("["+username + "]: " + message)
    //console.log(chatMsg)
    //console.log(chatIsWhisperFromMaster(chatMsg))
    
    if(chatIsWhisperFromMaster(chatMsg, translate)){
      console.log("accept msg")
      interfaceBot.chat("/msg " + SETTINGS.masterName + " Input Recieved")
      processCommand(interfaceBot, message)
    }
  })

  // Web-Inventory
  //interfaceBot.version = '1.17'
  //iv(interfaceBot)

  interfaceBot.on('kicked', console.log)
  interfaceBot.on('error', console.log)

}

main()
