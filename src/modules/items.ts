import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import {Window} from 'prismarine-windows'
import {Item} from 'prismarine-item'
import {Entity} from 'prismarine-entity'
import * as v from 'vec3'
const { goals } = mcPathsFinder


export const collectItems = async function(bot:mineflayer.Bot,firstPos:v.Vec3,secondPos:v.Vec3, borderAllowance:number = 3) : Promise<boolean>{
  let xMax = Math.max(firstPos.x,secondPos.x) + borderAllowance
  let zMax = Math.max(firstPos.z,secondPos.z) + borderAllowance
  let xMin = Math.min(firstPos.x,secondPos.x) - borderAllowance
  let zMin = Math.min(firstPos.z,secondPos.z) - borderAllowance

  let hasItem:boolean = true
  let botInventory = bot.inventory as unknown as Window
  
  while(hasItem && botInventory.emptySlotCount() > 2){
    let nextEntity = bot.nearestEntity((entity:Entity)=>{
      if(!entity){
        return false
      } 
      let pos = entity.position
  
      return entity.type === 'object' && pos.x <= xMax && pos.x >= xMin && pos.z <= zMax && pos.z >= zMin
    })

    if(!nextEntity){
      hasItem = false
      break;
    }
    let entityPos = nextEntity.position
    try {
      await bot.pathfinder.goto(new goals.GoalBlock(entityPos.x,entityPos.y,entityPos.z))
    } catch (error) {
      console.log("had goto error in collect Items")
    }
    
  }
  console.log("finish picking")

  return botInventory.emptySlotCount() > 2
}

export const analyzeSlots = function(slots:Item[]):[number[],number[]]{
  let counts:number[] = []
  let ids:number[] = []

  for(let i = 0; i< slots.length;i++){
    if(slots[i]){
      let index = ids.indexOf(slots[i].type)
      if(index >= 0){
        // already evaluted similar item
        counts[index] += slots[i].count
      } else {
        // new item
        ids.push(slots[i].type)
        counts.push(slots[i].count)
      }
    }
  }
  return [ids,counts]
}

export const enableEating = function(bot:mineflayer.Bot){
  bot.on('spawn',()=>{
    //@ts-ignore
    bot.autoEat.options.priority = "foodPoints"
    //@ts-ignore
    bot.autoEat.options.bannedFood = []
    //@ts-ignore
    bot.autoEat.options.eatingTimeout =3
  })

  bot.on("health", ()=>{
    //@ts-ignore
    if(bot.food === 20) bot.autoEat.disable()
    //@ts-ignore
    else bot.autoEat.enable() 
  })

}

export function itemToPrettyString (item:Item,num:number,itemArray:Item[]) {
  if (item) {
    return item.name + ' x ' + item.count
  } else {
    return '(nothing)'
  }
}