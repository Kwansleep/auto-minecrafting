import { SETTINGS } from "../settings.js"

export const chatIsWhisperFromMaster = function(chatMsg:any,translate:any = null):boolean{

  if(translate && translate == 'commands.message.display.outgoing'){
    return false
  }
  
  if(chatMsg){
    if(chatMsg.extra){
      if(chatMsg.extra[0] && (chatMsg.extra[0].text as string).trim() === SETTINGS.masterName){
        return true
      } 
    } else if (chatMsg.with){
      if(chatMsg.with[0] && (chatMsg.with[0].text as string).trim() === SETTINGS.masterName){
        return true
      }
    }
  }
  return false
}