// @ts-check
import mineflayer from 'mineflayer'

export const lookAtPlayer = async function(bot:mineflayer.Bot,playerName:string){

  const player = bot.players[playerName]
  if(!player) return
  const playerEntity = player.entity
  if(!playerEntity) return

  var pos = playerEntity.position.offset(0,playerEntity.height,0)
  
  await bot.lookAt(pos)
}

export const lookAtMaster = async function(this:mineflayer.Bot){
  const playerfilter = (entity:any) => entity.type === 'player'
  const playerEntity = this.nearestEntity(playerfilter)

  if(!playerEntity) return

  var pos = playerEntity.position.offset(0,playerEntity.height,0)
  
  await this.lookAt(pos)
}