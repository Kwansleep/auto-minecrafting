// @ts-check
import mineflayer from 'mineflayer'

export const lookAtPlayer = async function(bot:mineflayer.Bot,playerName:string):Promise<boolean>{

  const player = bot.players[playerName]
  if(!player) return false
  const playerEntity = player.entity
  if(!playerEntity) return false

  var pos = playerEntity.position.offset(0,playerEntity.height,0)
  
  await bot.lookAt(pos)
  return true
}

export const lookAtMaster = async function(this:mineflayer.Bot){
  const playerfilter = (entity:any) => entity.type === 'player'
  const playerEntity = this.nearestEntity(playerfilter)

  if(!playerEntity) return

  var pos = playerEntity.position.offset(0,playerEntity.height,0)
  
  await this.lookAt(pos)
  return
}

export const lookAtFront = async function(bot:mineflayer.Bot):Promise<Boolean>{
  if(bot.entity){
    var pos = bot.entity.position.offset(1,bot.entity.height,0)
    await bot.lookAt(pos)
    return true
  } else {
    return false
  }
}